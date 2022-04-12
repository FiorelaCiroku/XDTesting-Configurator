import { Injectable } from '@angular/core';
import {
  ApiResult,
  ContentFile,
  CreateOrUpdateFile,
  CreateOrUpdateFileResponse,
  Fragment,
  Repository, ShortBranch,
  TestDetail, TestingType, WorkflowRunResponse, UserInput
} from '../models';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, EMPTY, from, map, Observable, of, switchMap, tap, throwError, zip } from 'rxjs';
import { baseUrl } from '../../environments/environment';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY, TEST_TYPE_DEFINITIONS } from '../constants';
import { Router } from '@angular/router';
import * as moment from 'moment';


@Injectable({
  providedIn: 'root'
})
export class ApiService {

  readonly $loading = new BehaviorSubject<boolean>(true);

  private repositories?: Repository[];
  private repositoriesEtag?: string;

  private userInput?: UserInput;
  private userInputEtag?: string;
  private userInputSha?: string;

  private branchesEtag?: string;
  private branches?: ShortBranch[];

  private workflowRunsEtag?: string;
  private workflowRuns?: WorkflowRunResponse;

  private baseDir = '.xd-testing';
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

  listFiles(fragmentName?: string): Observable<ContentFile[]> {
    const url = ApiService.getUrl('/repos/{repo}/contents/.xd-testing' + (fragmentName ? `/${fragmentName}` : ''));

    if (!url) {
      return EMPTY;
    }

    return this._http.get<ContentFile[]>(url)
      .pipe(catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of([]);
        }

        return throwError(() => err);
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

  getTestingType(repository: string, branch: string): Observable<TestingType | undefined> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`, repository, branch);

    if (!url) {
      return EMPTY;
    }

    return this._http.get<ContentFile>(url,{ observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.type;
      }))
      .pipe(catchError(() => of(this.userInput?.type)));

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

  getTests(): Observable<TestDetail[]> {
    const headers = ApiService.getDefaultHeaders(this.userInputEtag);
    const url = ApiService.getUrl(`/repos/{repo}/contents/${this.userInputPath}`);

    if (!url) {
      return EMPTY;
    }

    return this._http.get<ContentFile>(url, {observe: 'response', headers})
      .pipe(map(res => {
        this.userInput = this._parseUserInput(res);
        return this.userInput.tests || [];
      }))
      .pipe(catchError(() => {
        return of(this.userInput?.tests || []);
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

  getTest(id: string): Observable<TestDetail> {
    return this.getTests()
      .pipe(map(tests => {
        const filteredTests = tests.filter(f => f.id === id);

        if (filteredTests.length === 0) {
          throw `No tests found with id ${id}`;
        } else {
          return filteredTests[0];
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

  updateTestingType(repo: string, branch: string, testingType: TestingType): Observable<ApiResult> {
    return this.getTestingType(repo, branch)
      .pipe(switchMap((type): Observable<ApiResult> => {
        if (type === testingType) {
          return of({success: true});
        }

        const content: UserInput = {
          ...(this.userInput || {}),
          type: testingType
        };

        return this._updateUserInput(
          JSON.stringify(content, null, 4),
          'Updated testing type',
          this.userInputSha
        )
          .pipe(map(() => ({success: true}) ));

      }))
      .pipe(catchError((err) => {
        return of({success: false, err: err.message});
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

  updateTest(testDetail: Omit<TestDetail, 'id'>, testId?: string): Observable<ApiResult<TestDetail>> {
    return this.getTests()
      .pipe(switchMap(tests => {
        let newTest: TestDetail;
        let message: string;

        if (!testId) {
          const prefix = TEST_TYPE_DEFINITIONS[testDetail.type].idPrefix;
          const re = new RegExp(`^${prefix}`);
          let lastId = 0;

          for (const test of tests) {
            if (!test.id.startsWith(prefix)) {
              continue;
            }

            const temp = parseInt(test.id.replace(re, ''), 10);
            if (test.type === testDetail.type && temp > lastId) {
              lastId = temp;
            }
          }

          const newId = prefix + (lastId + 1).toString().padStart(3, '0');
          newTest = {...testDetail, id: newId};
          tests.push(newTest);
          message = `Added test ${newId}`;
        }
        else {
          let index: number | undefined;

          for (let i = 0; i < tests.length; i++) {
            const test = tests[i];
            if (test.type === testDetail.type && test.id === testId) {
              index = i;
              break;
            }
          }

          if (index === undefined) {
            return throwError(() => 'Test id not found');
          }

          const oldTest = tests[index];
          newTest = {...testDetail, id: oldTest.id};
          tests.splice(index, 1, newTest);
          message = `Updated tests ${oldTest.id}`;
        }

        return this._updateTests(tests, message,  this.userInputSha)
          .pipe(map(() => newTest));
      }))

      .pipe(map((data): ApiResult<TestDetail> => ({success: true, data}) ))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }

  uploadFile(dataFile: File, fragment?: string): Observable<ApiResult<string>> {
    let name = dataFile.name;

    return zip(from(dataFile.text()), this.listFiles(fragment))
      .pipe(switchMap(([fileContent, fileList]) => {
        const isPresent = fileList.filter(f => f.name === name).length > 0;


        if (isPresent) {
          const chunks = name.split('.');
          const time = moment().format('YYYYMMDDHHmmssSSS');

          if (chunks.length > 1) {
            name = chunks.slice(0, -1).join('.') + '_' + time + chunks[chunks.length - 1];
          } else {
            name = name + '_' + time;
          }
        }

        const body: CreateOrUpdateFile = {
          message: `Uploaded file ${name}` + (fragment ? ` for fragment ${fragment}` : ''),
          content: btoa(fileContent),
        };

        const url = ApiService.getUrl(`/repos/{repo}/contents/${this.baseDir}` + (fragment ? `/${fragment}` : '') + `/${name}`);
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

  deleteTest(testId: string): Observable<ApiResult> {
    return this.getTests()
      .pipe(switchMap((tests) => {
        tests = tests.filter(t => t.id !== testId);

        return this._updateTests(tests, `Removed test ${testId}`, this.userInputSha);
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
      content: btoa(content),
    };

    if (sha) {
      body.sha = sha;
    }

    return this._http.put<CreateOrUpdateFileResponse>(url, body);
  }

  private _updateFragments(fragments: Fragment[], message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    const content = {
      ...this.userInput || { type: 'XD_TESTING' },
      fragments
    };

    return this._updateUserInput(JSON.stringify(content, null, 2), message, sha)
      .pipe(tap((res) => {
        this.userInputSha = res.content?.sha;
        this.userInputEtag = `"${res.content?.sha}"`;
        this.userInput = content;
      }));
  }

  private _updateTests(tests: TestDetail[], message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    const content = {
      ...this.userInput || { type: 'STANDARD' },
      tests
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
    const defaultUserInput: UserInput = {type: 'XD_TESTING', fragments: [], tests: []};

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
}
