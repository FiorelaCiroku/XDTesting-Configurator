import { Injectable } from '@angular/core';
import {
  ApiResult,
  ContentFile,
  CreateOrUpdateFile,
  CreateOrUpdateFileResponse,
  Fragment,
  Repository, ShortBranch,
  TestDetail
} from '../models';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, catchError, EMPTY, from, map, Observable, of, switchMap, tap, throwError, zip } from 'rxjs';
import { baseUrl } from '../../environments/environment';
import { SELECTED_REPO_KEY, TEST_TYPE_DEFINITIONS } from '../constants';
import { Router } from '@angular/router';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  readonly $loading = new BehaviorSubject<boolean>(true);

  private repositories?: Repository[];
  private repositoriesEtag?: string;

  private fragments?: Fragment[];
  private fragmentsEtag?: string;
  private fragmentsSha?: string;

  private branchesEtag?: string;
  private branches?: ShortBranch[];

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

  listFiles(fragmentName: string): Observable<ContentFile[]> {
    const repo = localStorage.getItem(SELECTED_REPO_KEY);

    if (!repo) {
      return EMPTY;
    }

    return this._http.get<ContentFile[]>(`${baseUrl}/repos/${repo}/contents/.xd-testing/${fragmentName}`)
      .pipe(catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          return of([]);
        }

        return throwError(() => err);
      }));
  }

  getFragments(): Observable<Fragment[]> {
    const headers = ApiService.getDefaultHeaders(this.fragmentsEtag);
    const repo = localStorage.getItem(SELECTED_REPO_KEY);

    if (!repo) {
      return EMPTY;
    }

    return this._http.get<ContentFile>(
      `${baseUrl}/repos/${repo}/contents/${this.userInputPath}`,
      {observe: 'response', headers}
    )
      .pipe(map(res => {
        this.fragmentsEtag = res.headers.get('etag')?.replace('W/', '') || '';
        const body = res.body;

        if (res.status === 304 || !body) {
          console.log(this.fragments);
          return this.fragments || [];
        }

        this.fragmentsSha = body.sha;
        const fileContent = atob(body.content);

        if (!fileContent) {
          this.fragments = [];
        } else {
          this.fragments = JSON.parse(fileContent) as Fragment[];
        }

        return this.fragments;
      }))
      .pipe(catchError(() => {
        return of(this.fragments || []);
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

        return this._updateFragments(fragments, `Created fragment ${fragment.name}`, this.fragmentsSha);
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

        return this._updateFragments(fragments, `Updated fragment ${fragmentName}`,  this.fragmentsSha)
          .pipe(map(() => newTest));
      }))

      .pipe(map((data): ApiResult<TestDetail> => ({success: true, data}) ))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.error});
      }));
  }

  uploadFile(fragment: string, dataFile: File): Observable<ApiResult<string>> {
    let name = dataFile.name;

    return zip(from(dataFile.text()), this.listFiles(fragment))
      .pipe(switchMap(([fileContent, fileList]) => {
        const repo = localStorage.getItem(SELECTED_REPO_KEY);

        if (!repo) {
          return EMPTY;
        }

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
          message: `Uploaded file ${name} for fragment ${fragment}`,
          content: btoa(fileContent),
        };

        return this._http.put(`${baseUrl}/repos/${repo}/contents/${this.baseDir}/${fragment}/${name}`, body);
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
        return this._updateFragments(fragments, `Removed fragment ${fragmentName}`, this.fragmentsSha);
      }))

      .pipe(map(() => ({success: true})))
      .pipe(catchError((err: HttpErrorResponse) => {
        return of({success: false, message: err.message});
      }));
  }

  deleteTest(fragmentName: string, testId: string): Observable<ApiResult> {
    return this.getFragments()
      .pipe(switchMap((fragments) => {
        const fragment = fragments.find(f => f.name === fragmentName);

        if (!fragment) {
          return of(null);
        }

        fragment.tests = fragment.tests?.filter(t => t.id !== testId);

        return this._updateFragments(fragments, `Removed test ${testId} from fragment ${fragmentName}`, this.fragmentsSha);
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
    const body: CreateOrUpdateFile = {
      message,
      content: btoa(content),
    };

    if (sha) {
      body.sha = sha;
    }

    const repo = localStorage.getItem(SELECTED_REPO_KEY);

    if (!repo) {
      return EMPTY;
    }

    return this._http.put<CreateOrUpdateFileResponse>(`${baseUrl}/repos/${repo}/contents/${this.userInputPath}`, body);
  }

  private _updateFragments(fragments: Fragment[], message: string, sha?: string): Observable<CreateOrUpdateFileResponse> {
    return this._updateUserInput(JSON.stringify(fragments, null, 2), message, sha)
      .pipe(tap((res) => {
        this.fragmentsSha = res.content?.sha;
        this.fragmentsEtag = `"${res.content?.sha}"`;
        this.fragments = fragments;
      }));
  }
}
