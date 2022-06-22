import { Injectable } from '@angular/core';
import {
  ApiResult,
  ContentFile,
  CreateOrUpdateFile,
  CreateOrUpdateFileResponse,
  Fragment,
  Repository, ShortBranch,
  TestDetail, UserInput, FileTypes, Ontology, OntologyForm
} from '../models';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import {
  BehaviorSubject,
  catchError,
  EMPTY,
  forkJoin,
  from,
  map,
  Observable,
  of,
  switchMap,
  tap,
  throwError,
  zip
} from 'rxjs';
import { baseUrl } from '../../environments/environment';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY, TEST_TYPE_DEFINITIONS, FILE_TYPES } from '../constants';
import { Router } from '@angular/router';
import * as moment from 'moment';
import { encode } from 'js-base64';
import { filterNullUndefined } from '../utils';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  readonly $loading = new BehaviorSubject<boolean>(true);
  readonly baseDir = '.xd-testing';

  private repositories?: Repository[];
  private repositoriesEtag?: string;

  private userInput?: UserInput;
  private userInputEtag?: string;
  private userInputSha?: string;

  private branchesEtag?: string;
  private branches?: ShortBranch[];

  private userInputPath = `${this.baseDir}/UserInput.json`;


  constructor(private _http: HttpClient, private _router: Router) {
  }


  /**
   * Creates default header for GitHub
   * @see {@link https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#conditional-requests}
   * @param etag
   * @returns
   */
  private static getDefaultHeaders(etag?: string): {'If-None-Match'?: string} {
    if (etag) {
      return {'If-None-Match': etag};
    }

    return {};
  }

  /**
   * Builds URL from a template in the form `/{repo}/rest/of/url`
   * @param relativeUrl Relative URL without host with placeholders. E.g.: `/{repo}/contents/my-file.json`
   * @param repo Repository to use in the form `username/repo-name`
   * @param branch Branch to use
   * @returns URL parsed and substituted with actual value
   */
  private static getUrl(relativeUrl: string, repo?: string | null, branch?: string | null): string | null {
    // check if the method is given a repo and branch otherwise get from localStorage
    repo = repo || localStorage.getItem(SELECTED_REPO_KEY);
    branch = branch || localStorage.getItem(SELECTED_BRANCH_KEY);

    if (!repo || ! branch) {
      return null;
    }

    // build the url appending baseUrl
    relativeUrl = baseUrl + relativeUrl.replace(/(?:\{user}\/)?\{repo}/, repo);

    // add branch name
    relativeUrl += `?branch=${branch}`;

    return relativeUrl;
  }


  /**
   * Get list of user-owned repository
   * Depending on supplied scope when requesting token, it will retrieve only public or also private repositories
   * @returns `Observable` of array of `Repository`
   */
  listRepos(): Observable<Repository[]> {
    const headers = ApiService.getDefaultHeaders(this.repositoriesEtag);

    return this._http.get<Repository[]>(`${baseUrl}/user/repos?type=all`, {observe: 'response', headers})
      .pipe(map(res => {
        // per https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#conditional-requests
        // save ETag and list of repositories
        this.repositoriesEtag = res.headers.get('etag')?.replace('W/', '') || '';
        this.repositories = res.body || [];
        return this.repositories;
      }))
      .pipe(catchError(() => {
        // 304 responses make HttpClient throw error and thus, it must be handled this way
        return of(this.repositories || []);
      }));
  }

  /**
   * Get list of branches for repository
   * @param repository in the form of `username/repo-name`
   * @returns `Observable` of list of branches
   */
  listBranches(repository: string): Observable<ShortBranch[]> {
    const headers = ApiService.getDefaultHeaders(this.branchesEtag);

    return this._http.get<ShortBranch[]>(`${baseUrl}/repos/${repository}/branches`, {observe: 'response', headers})
      .pipe(map(res => {
        // per https://docs.github.com/en/rest/guides/getting-started-with-the-rest-api#conditional-requests
        // save ETag and list of branches
        this.branchesEtag = res.headers.get('etag')?.replace('W/', '') || '';
        this.branches = res.body || [];
        return this.branches;
      }))
      .pipe(catchError(() => {
        // 304 responses make HttpClient throw error and thus, it must be handled this way
        return of(this.branches || []);
      }));
  }

  /**
   * Get list of files for a specified directory
   * @param path path to the directory relative to the root of the repository
   * @returns `Observable` of list of files
   */
  listFiles(path?: string): Observable<ContentFile[]> {
    const listUrl = `/repos/{repo}/contents/${path || ''}`;
    const url = ApiService.getUrl(listUrl);

    if (!url) {
      return throwError(() => 'Error building URL. Repository or branch undefined');
    }

    return this._http.get<ContentFile[]>(url)
      .pipe(catchError((err: HttpErrorResponse) => {
        // if directory is not found, simply return an empty array
        if (err.status === 404) {
          return of([]);
        }

        // else, throw the error
        return throwError(() => err);
      }));
  }

  /**
   * List files for specified test of a specified fragment.
   * NOTE: files are divided by type in subdirectories
   * @param fragment
   * @param type Optional filter for file type
   * @returns `Observable` of list of files
   */
  listTestFiles(fragment?: Fragment, type?: FileTypes): Observable<ContentFile[]> {
    // fragment is required but declared as optional in method's signature for convenience
    if (!fragment) {
      return throwError(() => 'Empty fragment name');
    }

    // build relative base URL
    const baseFragmentUrl = `${this.baseDir}/${fragment.ontologyName}/${fragment.name}`;
    let urls: string[] = [];

    if (type) {
      // if is given a type to filter on, let's just add the corresponding URL of the directory
      urls.push(baseFragmentUrl + '/' + FILE_TYPES[type].folder);
    } else {
      // add URLs of all subdirectories where files of different kind lies
      urls = Object.values(FILE_TYPES).map(ft => baseFragmentUrl + '/' + ft.folder)
        .filter(filterNullUndefined)
        .filter(u => !!u);
    }

    if (!urls.length) {
      // if there is no URLs in array, throw an error
      // Should fall in this case if FILE_TYPES is an empty object
      return throwError(() => 'Error retrieving files');
    }

    // execute all requests in parallel and return an array containing all the results of the API calls
    return forkJoin(urls.map(url => this.listFiles(url)))
      .pipe(map((results: ContentFile[][]): ContentFile[] => {
        // flatten the result to have a single array of files
        return results.flat();
      }));
  }

  /**
   * List fragments defined
   * It will read `UserInput.json` and return the list of fragment defined in there
   * @returns `Observable` of list of `Fragment`s
   */
  getFragments(): Observable<Fragment[]> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      // `EMPTY` stops all next observables
      return EMPTY;
    }

    return this._http.get<ContentFile>(url, {observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.fragments || [];
      }))
      .pipe(catchError(() => {
        // 304 responses make HttpClient throw error and thus, it must be handled this way
        return of(this.userInput?.fragments || []);
      }));
  }

  /**
   * Get a single fragment by name
   * @param name Fragment's name
   * @returns `Observable` of requested `Fragment`
   */
  getFragment(name: string): Observable<Fragment> {
    return this.getFragments()
      .pipe(map(fragments => {
        // search for fragment
        const filteredFragments = fragments.filter(f => f.name === name);

        if (filteredFragments.length === 0) {
          throw `No fragments found with name ${name}`;
        } else {
          return filteredFragments[0];
        }
      }));
  }

  /**
   * Creates a new fragment.
   * If fragment name is already present for the ontology, throws an error
   * @param fragment Fragment definition
   * @returns `Observable` of `ApiResult`
   */
  createFragment(fragment: Fragment): Observable<ApiResult> {
    return this.getFragments()
      .pipe(switchMap(fragments => {
        // Fragment can have the same name for different ontologies
        // to have unique naming it's been appended the ontology name
        const names = fragments.map(f => `${f.name}_${f.ontologyName}`);

        // if fragment name is found for the same ontology, throw an error
        if (names.includes(`${fragment.name}_${fragment.ontologyName}`)) {
          return throwError(() => new HttpErrorResponse({error: 'Fragment already exists'}));
        }

        // push fragment in the array
        fragments.push(fragment);

        // update fragments
        return this._updateFragments(fragments, `Created fragment ${fragment.name}`, this.userInputSha);
      }))

      // build ApiResult to return
      .pipe(map(() => ({success: true})))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }

  /**
   * Update test for Fragment
   * @param fragmentName
   * @param testDetail Test specification except id
   * @param testId Test id
   * @returns `Observable` of `ApiResult` having in `data` property the `TestDetail` specification
   */
  updateFragmentTest(fragment: Fragment, testDetail: Omit<TestDetail, 'id'>, testId?: string): Observable<ApiResult<TestDetail>> {
    return this.getFragments()
      .pipe(switchMap(fragments => {
        // Fragment can have the same name for different ontologies
        // to have unique naming it's been appended the ontology name
        const names = fragments.map(f => `${f.name}_${f.ontologyName}`);

        // Search for fragment using the mapping above
        const indexToUpdate = names.indexOf(`${fragment.name}_${fragment.ontologyName}`);

        // If fragment isn't found, index == -1
        if (indexToUpdate === -1) {
          return throwError(() => new HttpErrorResponse({error: 'Fragment not found'}));
        }

        // Get fragment
        const toUpdate = fragments[indexToUpdate];

        // if there's no test defined, create an empty array
        if (!toUpdate.tests) {
          toUpdate.tests = [];
        }

        let newTest: TestDetail;

        // If the method is not given a test id, it should create a new test, else it should update the
        // test with the provided testId
        if (!testId) {
          // Get the id prefix from the definitions and build a regex to grab the last id number
          const prefix = TEST_TYPE_DEFINITIONS[testDetail.type].idPrefix;
          const re = new RegExp(`^${prefix}`);
          let lastId = 0;

          // grab the last id number
          for (const test of toUpdate.tests) {
            if (!test.id.startsWith(prefix)) {
              continue;
            }

            // test.id is build like
            // TEST_TYPE_DEFINITIONS[testDetail.type].idPrefix + incrementingNumber
            // Removing the first part it can be obtained the last incrementing int
            const temp = parseInt(test.id.replace(re, ''), 10);
            if (test.type === testDetail.type && temp > lastId) {
              lastId = temp;
            }
          }

          // Create a new test definition with the calculated id and push into the array of tests
          // Spread operator used to not modify the original object
          // Also, id is padded at the beginning with zeros to normalize it to 3 digits
          newTest = {...testDetail, id: prefix + (lastId + 1).toString().padStart(3, '0')};
          toUpdate.tests.push(newTest);
        }
        else {
          let index: number | undefined;

          // get the index of the test
          for (let i = 0; i < toUpdate.tests.length; i++) {
            const test = toUpdate.tests[i];

            // check for test type and id
            if (test.type === testDetail.type && test.id === testId) {
              index = i;
              break;
            }
          }

          // if test is not found, index is undefined
          if (index === undefined) {
            return throwError(() => 'Test id not found');
          }

          // get and update the old test
          const oldTest = toUpdate.tests[index];
          // Spread operator used to not modify the original object
          newTest = {...testDetail, id: oldTest.id};
          toUpdate.tests.splice(index, 1, newTest);
        }

        return this._updateFragments(fragments, `Updated fragment ${fragment.name}`,  this.userInputSha)
          .pipe(map(() => newTest));
      }))

      .pipe(map((data): ApiResult<TestDetail> => ({success: true, data}) ))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }

  uploadFragmentFile(dataFile?: File, fragment?: Fragment): Observable<ApiResult<string>> {
    if (!dataFile) {
      return of({success: true});
    }

    let name = dataFile.name;

    if (!fragment) {
      return throwError(() => 'Fragment not provided');
    }

    return zip(from(dataFile.text()), this.listFiles(`${this.baseDir}/${fragment.ontologyName}/${fragment.name}`))
      .pipe(switchMap(([fileContent, fileList]) => {
        const isPresent = fileList.filter(f => f.name === name).length > 0;

        if (isPresent) {
          const chunks = name.split('.');
          const time = moment().format('YYYYMMDDHHmmssSSS');

          if (chunks.length > 1) {
            name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
          } else {
            name = name + '_' + time;
          }
        }

        const body: CreateOrUpdateFile = {
          message: `Uploaded file ${name}` + (fragment ? ` for fragment ${fragment.name}` : ''),
          content: encode(fileContent),
        };

        const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/` +
          (fragment ? `${fragment.ontologyName}/${fragment.name}` : '') + '/' + name
        );

        if (!url) {
          return throwError(() => 'Could not get url. Missing repository or branch');
        }

        return this._http.put(url, body);
      }))
      .pipe(map(() => ({success: true, data: name}) ))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }


  uploadTestFile(dataFile?: File, type?: FileTypes, fragment?: Fragment): Observable<ApiResult<string>> {
    if (!dataFile) {
      return of({success: true});
    }

    let name = dataFile.name;

    return zip(from(dataFile.text()), this.listTestFiles(fragment, type))
      .pipe(switchMap(([fileContent, fileList]) => {
        const isPresent = fileList.filter(f => f.name === name).length > 0;

        if (isPresent) {
          const chunks = name.split('.');
          const time = moment().format('YYYYMMDDHHmmssSSS');

          if (chunks.length > 1) {
            name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
          } else {
            name = name + '_' + time;
          }
        }

        const body: CreateOrUpdateFile = {
          message: `Uploaded file ${name}` + (fragment ? ` for fragment ${fragment.name}` : ''),
          content: encode(fileContent),
        };

        const subfolder = type ? FILE_TYPES[type].folder : null;

        const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/` +
          (fragment ? `${fragment.ontologyName}/${fragment.name}` : '') +
          '/' +
          (subfolder ? `${subfolder}/${name}` : name)
        );

        if (!url) {
          return EMPTY;
        }

        return this._http.put(url, body);
      }))
      .pipe(map(() => ({success: true, data: name}) ))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }

  deleteFragment(fragmentName: string): Observable<ApiResult> {
    return this.getFragments()
      .pipe(switchMap(fragments => {
        fragments = fragments.filter(f => f.name !== fragmentName);
        return this._updateFragments(fragments, `Removed fragment ${fragmentName}`, this.userInputSha);
      }))

      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }

  deleteTestFromFragment(fragmentName: string, testId: string): Observable<ApiResult> {
    return this.getFragments()
      .pipe(switchMap((fragments) => {
        const fragment = fragments.find(f => f.name === fragmentName);

        if (!fragment) {
          return of(null);
        }

        fragment.tests = fragment.tests?.filter(t => t.id !== testId);

        return this._updateFragments(fragments, `Removed test ${testId} from fragment ${fragmentName}`, this.userInputSha);
      }))
      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse): Observable<ApiResult> => {
        return of({
          success: false,
          message: err.message
        });
      }));
  }

  private _updateUserInput(content: string, message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      return EMPTY;
    }

    const body: CreateOrUpdateFile = {
      message,
      content: encode(content),
    };

    if (sha) {
      body.sha = sha;
    }

    return this._http.put<CreateOrUpdateFileResponse>(url, body);
  }

  private _updateFragments(fragments: Fragment[], message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    const content = {
      ...this.userInput || {},
      fragments
    };

    return this._updateUserInput(JSON.stringify(content, null, 2), message, sha)
      .pipe(tap((res) => {
        this.userInputSha = res.content?.sha;
        this.userInputEtag = `"${res.content?.sha}"`;
        this.userInput = content;
      }));
  }

  private _parseUserInput(res: HttpResponse<ContentFile>): UserInput {
    this.userInputEtag = res.headers.get('etag')?.replace('W/', '') || '';

    const body = res.body;
    const defaultUserInput: UserInput = { fragments: [] };

    if (!body) {
      return defaultUserInput;
    }

    this.userInputSha = body.sha;
    const fileContent = atob(body.content);

    if (!fileContent) {
      return defaultUserInput;
    }

    return JSON.parse(fileContent) as UserInput;
  }

  getFragmentTest(fragmentName: string, testId: string): Observable<TestDetail> {
    return this.getFragment(fragmentName)
      .pipe(switchMap((res): Observable<TestDetail> => {
        const test = res.tests?.find(t => t.id === testId);

        if (!test) {
          return throwError(() => 'No test found with id ' + testId);
        }

        return of(test);
      }));
  }

  listOntologies(): Observable<Ontology[]> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      return throwError(() => 'Repository or branch not selected');
    }

    return this._http.get<ContentFile>(url, {observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.ontologies || [];
      }))
      .pipe(catchError(() => {
        return of(this.userInput?.ontologies || []);
      }));
  }

  uploadOntology(ontology: OntologyForm): Observable<ApiResult> {
    if (!ontology.file?.length && !ontology.url) {
      return throwError(() => 'Neither file nor URL provided');
    }

    let $uploadSrc: Observable<ApiResult<string>> = of({success: true});


    if (ontology.file?.length) {
      let name = ontology.file[0].name;
      const $content = from(ontology.file[0].text());

      $uploadSrc = zip($content, this.listOntologies(), this.listFiles(`${this.baseDir}/${ontology.name}`))
        .pipe(switchMap(([fileContent, ontologies, fileList]: [string, Ontology[], ContentFile[]]) => {
          const alreadyDefined = ontologies.filter(o => o.name === ontology.name);

          if (alreadyDefined?.length) {
            return throwError(() => `Duplicated ontology: an ontology with name "${ontology.name}" is already defined`);
          }

          const isPresent = fileList.filter(f => f.name === name).length > 0;

          if (isPresent) {
            const chunks = name.split('.');
            const time = moment().format('YYYYMMDDHHmmssSSS');

            if (chunks.length > 1) {
              name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
            } else {
              name = name + '_' + time;
            }
          }

          const body: CreateOrUpdateFile = {
            message: `Uploaded ontology ${name}`,
            content: encode(fileContent),
          };

          const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/${ontology.name}/${name}`);

          if (!url) {
            return throwError(() => 'Repository or branch not selected');
          }

          return this._http.put(url, body);
        }))
        .pipe(map(() => {
          const repo = localStorage.getItem(SELECTED_REPO_KEY);
          const branch = localStorage.getItem(SELECTED_BRANCH_KEY);
          const url = `https://raw.githubusercontent.com/${repo}/${branch}/${this.baseDir}/${ontology.name}/${name}`;

          return { success: true, data: url };
        }));

    } else if (ontology.url) {
      $uploadSrc = this.listOntologies()
        .pipe(switchMap((ontologies) => {
          const alreadyDefined = ontologies.filter(o => o.name === ontology.name);

          if (alreadyDefined?.length) {
            return throwError(() => `Duplicated ontology: an ontology with name "${ontology.name}" is already defined`);
          }

          return of({success: true, data: ontology.url});
        }));
    }

    return $uploadSrc.pipe(switchMap((apiResult) => {

      const ontologies = this.userInput?.ontologies || [];

      if (!apiResult.data) {
        return throwError(() => 'Application error during save. URL not defined');
      }

      ontologies.push({
        url: apiResult.data,
        name: ontology.name,
        userDefined: true
      });

      const userInput: UserInput = {
        ...this.userInput || {},
        ontologies
      };

      return this._updateUserInput(
        JSON.stringify(userInput, null, 2),
        `Added ontology ${apiResult.data} to UserInput.json`,
        this.userInputSha
      );
    }))
      .pipe(map((): ApiResult => ({ success: true })))
      .pipe(catchError((err): Observable<ApiResult> => of({success: false, message: err })));
  }

  deleteOntology(name: string): Observable<ApiResult> {
    return this.listOntologies()
      .pipe(switchMap(ontologies => {
        ontologies = ontologies.filter(o => o.name !== name);
        const fragments = (this.userInput?.fragments || []).filter(f => f.ontologyName !== name);

        const userInput: UserInput = {
          fragments,
          ontologies
        };

        return this._updateUserInput(JSON.stringify(userInput, null, 2), `Removed ontology ${name}`, this.userInputSha);
      }))
      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }

  updateOntologies(updatedOntologies: Ontology[]): Observable<ApiResult> {
    return this.listOntologies()
      .pipe(switchMap(ontologies => {
        const ontoMap = Object.fromEntries(ontologies.map(o => [o.url, o]));

        for (let i = 0; i < updatedOntologies.length; i++) {
          const ontology = updatedOntologies[i];

          if (ontology.url && ontoMap[ontology.url]) {
            ontoMap[ontology.url] = ontology;
          }
        }

        ontologies = Object.values(ontoMap);

        const userInput: UserInput = {
          fragments: this.userInput?.fragments || [],
          ontologies
        };

        return this._updateUserInput(JSON.stringify(userInput, null, 2), `Removed ontology ${name}`, this.userInputSha);
      }))
      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }
}
