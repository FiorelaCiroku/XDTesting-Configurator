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
import { encode, decode } from 'js-base64';
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

    // Get list of fragments from UserInput.json
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
   * @param ontologyName Name of the ontology the fragment belongs to
   * @returns `Observable` of requested `Fragment`
   */
  getFragment(name: string, ontologyName: string): Observable<Fragment> {
    // Get fragment by retrieving current UserInput.json and filtering over fragment and ontology name
    // NOTE: fragment and ontology name should be unique
    return this.getFragments()
      .pipe(map(fragments => {
        // search for fragment
        const filteredFragments = fragments.filter(f => f.name === name && f.ontologyName === ontologyName);

        if (filteredFragments.length === 0) {
          throw `No fragments found with name ${name} belonging to ontology ${ontologyName}`;
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
   * @returns `Observable` of `ApiResult` having in `data` the `TestDetail` specification
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

      // build ApiResult to return
      .pipe(map((data): ApiResult<TestDetail> => ({success: true, data}) ))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }


  /**
   * Uploads fragment definition file (i.e.: .owl file)
   * @param dataFile File to upload
   * @param fragment Reference fragment
   * @returns Observable of ApiResult having in `data` the URL of the uploaded file
   */
  uploadFragmentFile(dataFile?: File, fragment?: Fragment): Observable<ApiResult<string>> {
    if (!dataFile) {
      // if dataFile is not provided just return a successful response
      return of({success: true});
    }

    // get file name
    let name = dataFile.name;

    // fragment is required but declared as optional in method's signature for convenience
    if (!fragment) {
      return throwError(() => 'Fragment not provided');
    }

    // get file content and list fragment files in parallel using zip
    return zip(from(dataFile.text()), this.listFiles(`${this.baseDir}/${fragment.ontologyName}/${fragment.name}`))
      .pipe(switchMap(([fileContent, fileList]) => {
        // check if a file with the same name is already been uploaded
        const isPresent = fileList.filter(f => f.name === name).length > 0;

        // if there's already a file with the same name, append the current timestamp
        if (isPresent) {
          const chunks = name.split('.');
          const time = moment().format('YYYYMMDDHHmmssSSS');

          // if chunks.length > 1 -> the file has an extension
          if (chunks.length > 1) {
            // append the timestamp before the extension and, then, append the extension
            // resulting filename will be: `duplicated.file.name_20220101000000000.ext`
            name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
          } else {
            // simply append the timestamp
            // resulting filename will be: `duplicatedFileName_20220101000000000`
            name = name + '_' + time;
          }
        }

        // Body required by Git APIs to upload / update a file
        const body: CreateOrUpdateFile = {
          message: `Uploaded file ${name}` + (fragment ? ` for fragment ${fragment.name}` : ''), // Commit message
          content: encode(fileContent), // base64 encoding of the content
        };

        // URL where to upload file
        const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/` +
          (fragment ? `${fragment.ontologyName}/${fragment.name}` : '') + '/' + name
        );

        if (!url) {
          return throwError(() => 'Could not get url. Missing repository or branch');
        }

        // API call to update the file
        return this._http.put(url, body);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true, data: name}) ))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }


  /**
   * Uploads a file relative to a test definition.
   * @param dataFile File to upload
   * @param type Type of the file to upload (e.g.: dataset)
   * @param fragment Reference fragment (fragment in which is defined the test)
   * @returns `Observable` of `ApiResult` having in `data` the URL of the uploaded file
   */
  uploadTestFile(dataFile?: File, type?: FileTypes, fragment?: Fragment): Observable<ApiResult<string>> {
    if (!dataFile) {
      // if dataFile is not provided just return a successful response
      return of({success: true});
    }

    // get file name
    let name = dataFile.name;

    // get file content and list test files in parallel using `zip`
    return zip(from(dataFile.text()), this.listTestFiles(fragment, type))
      .pipe(switchMap(([fileContent, fileList]) => {
        // check if a file with the same name is already been uploaded
        const isPresent = fileList.filter(f => f.name === name).length > 0;

        // if there's already a file with the same name, append the current timestamp
        if (isPresent) {
          const chunks = name.split('.');
          const time = moment().format('YYYYMMDDHHmmssSSS');

          // if chunks.length > 1 -> the file has an extension
          if (chunks.length > 1) {
            // append the timestamp before the extension and, then, append the extension
            // resulting filename will be: `duplicated.file.name_20220101000000000.ext`
            name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
          } else {
            // simply append the timestamp
            // resulting filename will be: `duplicatedFileName_20220101000000000`
            name = name + '_' + time;
          }
        }

        // Body required by Git APIs to upload / update a file
        const body: CreateOrUpdateFile = {
          message: `Uploaded file ${name}` + (fragment ? ` for fragment ${fragment.name}` : ''), // Commit message
          content: encode(fileContent), // base64 encoding of the content
        };

        const subfolder = type ? FILE_TYPES[type].folder : null;

        // URL where to upload file
        const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/` +
          (fragment ? `${fragment.ontologyName}/${fragment.name}` : '') +
          '/' +
          (subfolder ? `${subfolder}/${name}` : name)
        );

        if (!url) {
          return EMPTY;
        }
        // API call to update the file
        return this._http.put(url, body);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true, data: name}) ))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }


  /**
   * Deletes a fragment
   * @param fragment Fragment to delete
   * @returns `Observable` of `ApiResult`
   */
  deleteFragment(fragment: Fragment): Observable<ApiResult> {
    // list fragments
    return this.getFragments()
      .pipe(switchMap(fragments => {
        // filter out the one with the same name and ontology name
        // NOTE: fragment.name and fragment.ontologyName should be unique
        fragments = fragments.filter(f => f.name !== fragment.name && f.ontologyName !== fragment.ontologyName);

        // update fragments
        return this._updateFragments(fragments, `Removed fragment ${fragment.name}`, this.userInputSha);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true})))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }


  /**
   * Deletes a test from the specified Fragment
   * @param fragment Parent fragment from which to delete test
   * @param testId id of test to delete
   * @returns `Observable` of `ApiResult`
   */
  deleteTestFromFragment(fragment: Fragment, testId: string): Observable<ApiResult> {
    // list fragments
    return this.getFragments()
      .pipe(switchMap((fragments) => {
        // get fragment to update
        const toUpdate = fragments.find(f => f.name === fragment.name && f.ontologyName === fragment.ontologyName);

        // if fragment is not found simply exit
        if (!toUpdate) {
          return of(null);
        }

        // filter out the test with the specified id
        toUpdate.tests = toUpdate.tests?.filter(t => t.id !== testId);

        // update fragment
        return this._updateFragments(fragments, `Removed test ${testId} from fragment ${fragment.name}`, this.userInputSha);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true})))

      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse): Observable<ApiResult> => {
        return of({
          success: false,
          message: err.message
        });
      }));
  }

  /**
   * Get test by id
   * @param fragment Fragment from which to retrieve test
   * @param testId Id of the test to retrieve
   * @returns `Observable` of `TestDetail`
   */
  getFragmentTest(fragment: Fragment, testId: string): Observable<TestDetail> {
    // get actual fragment from repository
    return this.getFragment(fragment.name, fragment.ontologyName)
      .pipe(switchMap((res): Observable<TestDetail> => {
        // find test by id
        const test = res.tests?.find(t => t.id === testId);

        if (!test) {
          return throwError(() => 'No test found with id ' + testId);
        }

        return of(test);
      }));
  }


  /**
   * Returns the list of ontologies
   * @returns `Observable` of list of `Ontology`
   */
  listOntologies(): Observable<Ontology[]> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      return throwError(() => 'Repository or branch not selected');
    }

    // get list of ontologies from UserInput.json
    return this._http.get<ContentFile>(url, {observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.ontologies || [];
      }))
      .pipe(catchError(() => {
        // 304 responses make HttpClient throw error and thus, it must be handled this way
        return of(this.userInput?.ontologies || []);
      }));
  }


  /**
   * Stores a new ontology either by uploading a file or by providing the URL of an already uploaded file
   * NOTE: the URL should start with `https://raw.githubusercontent.com
   * @param ontology Ontology form data to store
   * @returns `Observable` of `ApiResult`
   */
  uploadOntology(ontology: OntologyForm): Observable<ApiResult> {
    // Check at least the file or the URL is present
    if (!ontology.file?.length && !ontology.url) {
      return throwError(() => 'Neither file nor URL provided');
    }

    let $uploadSrc: Observable<ApiResult<string>> = of({success: true});

    // If user selected a file
    if (ontology.file?.length) {
      // get file name
      let name = ontology.file[0].name;

      // prepare content observable
      const $content = from(ontology.file[0].text());

      // get file content, ontologies, and ontology files (if any) in parallel using `zip`
      $uploadSrc = zip($content, this.listOntologies(), this.listFiles(`${this.baseDir}/${ontology.name}`))
        .pipe(switchMap(([fileContent, ontologies, fileList]: [string, Ontology[], ContentFile[]]) => {

          // check if an ontology with the same name has already been defined
          const alreadyDefined = ontologies.filter(o => o.name === ontology.name);

          // if duplicated ontology, throw an error
          if (alreadyDefined?.length) {
            return throwError(() => `Duplicated ontology: an ontology with name "${ontology.name}" is already defined`);
          }

          // filter over files and check if there's at least another file with the same name
          const isPresent = fileList.filter(f => f.name === name).length > 0;


          // if there's already a file with the same name, append the current timestamp
          if (isPresent) {
            const chunks = name.split('.');
            const time = moment().format('YYYYMMDDHHmmssSSS');

            // if chunks.length > 1 -> the file has an extension
            if (chunks.length > 1) {
              // append the timestamp before the extension and, then, append the extension
              // resulting filename will be: `duplicated.file.name_20220101000000000.ext`
              name = chunks.slice(0, -1).join('.') + '_' + time + '.' + chunks[chunks.length - 1];
            } else {
              // simply append the timestamp
              // resulting filename will be: `duplicatedFileName_20220101000000000`
              name = name + '_' + time;
            }
          }

          // Body required by Git APIs to upload / update a file
          const body: CreateOrUpdateFile = {
            message: `Uploaded ontology ${name}`, // Commit message
            content: encode(fileContent), // base64 encoding of the content
          };

          // where to upload file (including file name)
          const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}/${ontology.name}/${name}`);

          if (!url) {
            return throwError(() => 'Repository or branch not selected');
          }

          // upload file
          return this._http.put(url, body);
        }))

        // build ApiResult
        .pipe(map(() => {

          // build url of the ontology
          const repo = localStorage.getItem(SELECTED_REPO_KEY);
          const branch = localStorage.getItem(SELECTED_BRANCH_KEY);
          const url = `https://raw.githubusercontent.com/${repo}/${branch}/${this.baseDir}/${ontology.name}/${name}`;

          // return ApiResult with ontology URL in data property
          return { success: true, data: url };
        }));

    } else if (ontology.url) {
      $uploadSrc = this.listOntologies()
        .pipe(switchMap((ontologies) => {
          // check if there's another ontology with the same name and, if so, throw an error
          const alreadyDefined = ontologies.filter(o => o.name === ontology.name);

          if (alreadyDefined?.length) {
            return throwError(() => `Duplicated ontology: an ontology with name "${ontology.name}" is already defined`);
          }

          // build ApiResult with ontology URL in data property
          return of({success: true, data: ontology.url});
        }));
    }

    // upload file if any, and return the ontology URL
    return $uploadSrc.pipe(switchMap((apiResult) => {
      // here it has already been checked if the ontology already exists so no need to check again
      const ontologies = this.userInput?.ontologies || [];

      // if URL is not present, something has errored and it has not been detected
      if (!apiResult.data) {
        return throwError(() => 'Application error during save. URL not defined');
      }

      // push the new ontology in ontologies list
      ontologies.push({
        url: apiResult.data,
        name: ontology.name,
        userDefined: true
      });

      // update UserInput with the new ontologies
      const userInput: UserInput = {
        ...this.userInput || {},
        ontologies // this overrides the old ontology list
      };

      // update user input
      return this._updateUserInput(
        JSON.stringify(userInput, null, 2), // formatting for visualization purposes
        `Added ontology ${apiResult.data} to UserInput.json`, // commit messages
        this.userInputSha // sha of the the previous UserInput.json
      );
    }))


      // build ApiResult to return
      .pipe(map((): ApiResult => ({ success: true })))


      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err): Observable<ApiResult> => of({success: false, message: err })));
  }


  /**
   * Deletes an ontology by name
   * @param name ontology name
   * @returns `Observable` of `ApiResult`
   */
  deleteOntology(name: string): Observable<ApiResult> {
    // get current list of ontologies from repository
    return this.listOntologies()
      .pipe(switchMap(ontologies => {
        // filter out the ontology having the provided name
        ontologies = ontologies.filter(o => o.name !== name);

        // remove corresponding fragments
        const fragments = (this.userInput?.fragments || []).filter(f => f.ontologyName !== name);

        // create a new UserInput.json with the filtered lists
        const userInput: UserInput = {
          fragments,
          ontologies
        };

        // update UserInput.json
        return this._updateUserInput(JSON.stringify(userInput, null, 2), `Removed ontology ${name}`, this.userInputSha);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true})))


      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }


  /**
   * Bulk update of multiple ontologies.
   * This method is used to include or exclude newly found ontologies.
   * @param updatedOntologies List of updated ontologies
   * @returns `Observable` of `ApiResult`
   */
  updateOntologies(updatedOntologies: Ontology[]): Observable<ApiResult> {
    // get current list of ontologies from repository
    return this.listOntologies()
      .pipe(switchMap(ontologies => {
        // map ontologies using URL as key
        // URL is unique for a file thus, if ontology is defined twice, this way is kept only the last one
        const ontoMap = Object.fromEntries(ontologies.map(o => [o.url, o]));

        for (let i = 0; i < updatedOntologies.length; i++) {
          const ontology = updatedOntologies[i];

          // ontology.url should always be defined
          // if an ontology we are updating is already present in the list of the ontologies, overwrite with the updated one
          if (ontology.url && ontoMap[ontology.url]) {
            ontoMap[ontology.url] = ontology;
          }
        }

        // get the list of the ontologies
        ontologies = Object.values(ontoMap);

        // update UserInput.json
        const userInput: UserInput = {
          fragments: this.userInput?.fragments || [], // fragment hasn't been touched, use the cached ones
          ontologies // provide the new ontology list
        };

        // update UserInput.json
        return this._updateUserInput(JSON.stringify(userInput, null, 2), `Removed ontology ${name}`, this.userInputSha);
      }))


      // build ApiResult to return
      .pipe(map(() => ({success: true})))


      // if any error occurs, build ApiResult with the error in it
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }

  /**
   * Updates or creates `UserInput.json` replacing its content with the provided one
   * @param content Raw content to put into UserInput.json file
   * @param message Commit message
   * @param sha Last UserInput.json sha returned from API. Leave it empty if the file has to be created
   * @returns `Observable` of GitHub API response
   */
  private _updateUserInput(content: string, message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    // if url is empty, repository and branch has not been selected
    if (!url) {
      return EMPTY;
    }

    // GitHub API request body
    const body: CreateOrUpdateFile = {
      message, // Commit message
      content: encode(content), // base64-encoded body
    };

    // if sha has been provided, add to request body
    // if is empty and UserInput.json already exists, API call will throw an error
    if (sha) {
      body.sha = sha;
    }

    // make update API call
    return this._http.put<CreateOrUpdateFileResponse>(url, body);
  }

  /**
   * Updates or creates fragment list in `UserInput.json`
   * @param fragments List of fragments to update
   * @param message Commit message
   * @param sha Last UserInput.json sha returned from API. Leave it empty if the file has to be created
   * @returns `Observable` of GitHub API response
   */
  private _updateFragments(fragments: Fragment[], message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    // re-create the user input
    const content: UserInput = {
      ...this.userInput || {},
      fragments // overwrite old fragment list with the new one
    };

    // upsert UserInput.json providing the stringified version of the new content
    return this._updateUserInput(JSON.stringify(content, null, 2), message, sha)
      .pipe(tap((res) => {
        this.userInputSha = res.content?.sha;
        this.userInputEtag = `"${res.content?.sha}"`;
        this.userInput = content;
      }));
  }

  /**
   * Parses the raw response from API call transforming into actual `UserInput`
   * @param res Raw response from API call including headers
   * @returns Parsed `UserInput.json` or a default one if it doesn't exists, is empty, or invalid
   */
  private _parseUserInput(res: HttpResponse<ContentFile>): UserInput {
    // gets and stores ETag from api response for future use
    // see ApiService.getDefaultHeaders
    this.userInputEtag = res.headers.get('etag')?.replace('W/', '') || '';

    const body = res.body;
    const defaultUserInput: UserInput = { ontologies: [], fragments: [] };

    // if body is empty, return a default user input
    // useful when UserInput.json has not created yet
    if (!body) {
      return defaultUserInput;
    }

    // store sha
    this.userInputSha = body.sha;
    let fileContent: string;

    try {
      // decode body from base64
      // will return a string representing the content of UserInput.json
      fileContent = decode(body.content);

      // if UserInput.json is empty, return the default UserInput
      if (!fileContent) {
        return defaultUserInput;
      }

      // parse and return UserInput.json
      return JSON.parse(fileContent) as UserInput;

    } catch (e) {
      // if an error occurs, log it and return the default UserInput
      console.error(e);
      return defaultUserInput;
    }
  }
}
