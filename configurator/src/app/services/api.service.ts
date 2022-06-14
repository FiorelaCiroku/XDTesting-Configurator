import { Injectable } from '@angular/core';
import {
  ApiResult,
  ContentFile,
  CreateOrUpdateFile,
  CreateOrUpdateFileResponse,
  Fragment,
  Repository, ShortBranch,
  TestDetail, WorkflowRunResponse, UserInput, FileTypes, Ontology, OntologyForm
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

  private workflowRunsEtag?: string;
  private workflowRuns?: WorkflowRunResponse;

  private userInputPath = `${this.baseDir}/UserInput.json`;


  constructor(private _http: HttpClient, private _router: Router) {
  }


  private static getDefaultHeaders(etag?: string): {'If-None-Match'?: string} {
    if (etag) {
      return {'If-None-Match': etag};
    }

    return {};
  }

  private static getUrl(relativeUrl: string, repo?: string | null, branch?: string | null): string | null {
    repo = repo || localStorage.getItem(SELECTED_REPO_KEY);
    branch = branch || localStorage.getItem(SELECTED_BRANCH_KEY);

    if (!repo || ! branch) {
      return null;
    }

    relativeUrl = baseUrl + relativeUrl.replace(/(?:\{user}\/)?\{repo}/, repo);
    relativeUrl += `?branch=${branch}`;

    return relativeUrl;
  }


  listRepos(): Observable<Repository[]> {
    const headers = ApiService.getDefaultHeaders(this.repositoriesEtag);

    return this._http.get<Repository[]>(`${baseUrl}/user/repos?type=all`, {observe: 'response', headers})
      .pipe(map(res => {
        this.repositoriesEtag = res.headers.get('etag')?.replace('W/', '') || '';
        this.repositories = res.body || [];
        return this.repositories;
      }))
      .pipe(catchError(() => {
        return of(this.repositories || []);
      }));
  }

  listBranches(repository: string): Observable<ShortBranch[]> {
    const headers = ApiService.getDefaultHeaders(this.branchesEtag);

    return this._http.get<ShortBranch[]>(`${baseUrl}/repos/${repository}/branches`, {observe: 'response', headers})
      .pipe(map(res => {
        this.branchesEtag = res.headers.get('etag')?.replace('W/', '') || '';
        this.branches = res.body || [];
        return this.branches;
      }))
      .pipe(catchError(() => {
        return of(this.branches || []);
      }));
  }

  listFiles(path?: string): Observable<ContentFile[]> {
    const listUrl = `/repos/{repo}/contents/${path || ''}`;
    const url = ApiService.getUrl(listUrl);

    if (!url) {
      return throwError(() => 'Error building URL. Repository or branch undefined');
    }

    return this._http.get<ContentFile[]>(url)
      .pipe(catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of([]);
        }

        return throwError(() => err);
      }));
  }

  listTestFiles(fragment?: Fragment, type?: FileTypes): Observable<ContentFile[]> {
    if (!fragment) {
      return throwError(() => 'Empty fragment name');
    }

    const baseFragmentUrl = `.xd-testing/${fragment.ontologyName}/${fragment.name}`;
    let urls: string[] = [];

    if (type) {
      urls.push(baseFragmentUrl + '/' + FILE_TYPES[type].folder);
    } else {
      urls = Object.values(FILE_TYPES).map(ft => baseFragmentUrl + '/' + ft.folder)
        .filter(filterNullUndefined)
        .filter(u => !!u);
    }

    if (!urls.length) {
      return throwError(() => 'Error retrieving files');
    }

    return forkJoin(urls.map(url => this.listFiles(url)))
      .pipe(map((results: ContentFile[][]): ContentFile[] => {
        return results.flat();
      }));
  }

  listWorkflows(): Observable<WorkflowRunResponse> {
    const url = ApiService.getUrl('/repos/{repo}/actions/runs');

    if (!url) {
      return EMPTY;
    }

    const defaultResponse: WorkflowRunResponse = {total_count: 0, workflow_runs: []};
    const headers = ApiService.getDefaultHeaders(this.workflowRunsEtag);

    return this._http.get<WorkflowRunResponse>(url, { observe: 'response', headers })
      .pipe(map((res) => {
        this.workflowRunsEtag = res.headers.get('etag')?.replace('W/', '') || '';
        this.workflowRuns = res.body || defaultResponse;
        return this.workflowRuns;
      }))
      .pipe(catchError(() => of(this.workflowRuns || defaultResponse)));
  }

  getFragments(): Observable<Fragment[]> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      return EMPTY;
    }

    return this._http.get<ContentFile>(url, {observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.fragments || [];
      }))
      .pipe(catchError(() => {
        return of(this.userInput?.fragments || []);
      }));
  }

  getFragment(name: string): Observable<Fragment> {
    return this.getFragments()
      .pipe(map(fragments => {
        const filteredFragments = fragments.filter(f => f.name === name);

        if (filteredFragments.length === 0) {
          throw `No fragments found with name ${name}`;
        } else {
          return filteredFragments[0];
        }
      }));
  }

  createFragment(fragment: Fragment): Observable<ApiResult> {
    return this.getFragments()
      .pipe(switchMap(fragments => {
        const names = fragments.map(f => `${f.name}_${f.ontologyName}`);
        if (names.includes(`${fragment.name}_${fragment.ontologyName}`)) {
          return throwError(() => new HttpErrorResponse({error: 'Fragment already exists'}));
        }

        fragments.push(fragment);

        return this._updateFragments(fragments, `Created fragment ${fragment.name}`, this.userInputSha);
      }))
      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }

  updateFragmentTest(fragmentName: string, testDetail: Omit<TestDetail, 'id'>, testId?: string): Observable<ApiResult<TestDetail>> {
    return this.getFragments()
      .pipe(switchMap(fragments => {
        let fragment;

        for (let i = 0; i < fragments.length; i++) {
          if (fragments[i].name === fragmentName) {
            fragment = fragments[i];
            break;
          }
        }

        if (!fragment) {
          return throwError(() => new HttpErrorResponse({error: 'Fragment not found'}));
        }

        if (!fragment.tests) {
          fragment.tests = [];
        }


        let newTest: TestDetail;

        if (!testId) {
          const prefix = TEST_TYPE_DEFINITIONS[testDetail.type].idPrefix;
          const re = new RegExp(`^${prefix}`);
          let lastId = 0;

          for (const test of fragment.tests) {
            if (!test.id.startsWith(prefix)) {
              continue;
            }

            const temp = parseInt(test.id.replace(re, ''), 10);
            if (test.type === testDetail.type && temp > lastId) {
              lastId = temp;
            }
          }

          newTest = {...testDetail, id: prefix + (lastId + 1).toString().padStart(3, '0')};
          fragment.tests.push(newTest);
        }
        else {
          let index: number | undefined;

          for (let i = 0; i < fragment.tests.length; i++) {
            const test = fragment.tests[i];
            if (test.type === testDetail.type && test.id === testId) {
              index = i;
              break;
            }
          }

          if (index === undefined) {
            return throwError(() => 'Test id not found');
          }

          const oldTest = fragment.tests[index];
          newTest = {...testDetail, id: oldTest.id};
          fragment.tests.splice(index, 1, newTest);
        }

        return this._updateFragments(fragments, `Updated fragment ${fragmentName}`,  this.userInputSha)
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
