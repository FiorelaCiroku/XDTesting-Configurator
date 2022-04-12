import { Component} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiResult, ContentFile, Fragment, FragmentDetailParams, TestDetail, TestType } from '../../models';
import { ApiService } from '../../services';
import { catchError, filter, forkJoin, Observable, of, switchMap, tap } from 'rxjs';
import { TEST_TYPE_DEFINITIONS } from '../../constants';

@Component({
  selector: 'config-fragment-detail',
  templateUrl: './fragment-detail.component.html',
  styleUrls: ['./fragment-detail.component.scss']
})
export class FragmentDetailComponent {

  fragment?: Fragment;
  errorMsg?: string;
  successMsg?: string;
  testTypes = TEST_TYPE_DEFINITIONS;
  tests: TestDetail[] = [];
  showAlert = false;
  deleting = false;
  fragmentFiles: string[] = [];
  uploading = false;

  constructor(private _route: ActivatedRoute, public apiService: ApiService) {
    this._initFragment();
  }

  testLabel(testType: TestType): string {
    return this.testTypes[testType].label;
  }

  deleteTest(testId: string): void {
    if (!confirm('Are you sure? Test data will be removed but files associated to it won\'t be deleted')) {
      return;
    }

    if (!this.fragment) {
      this.errorMsg = 'Unknown fragment. Application error';
      this.showAlert = true;
      return;
    }

    const fragmentName = this.fragment.name;
    this.deleting = true;

    const $sub = this.apiService.deleteTest(fragmentName, testId)
      .pipe(tap((res) => {
        if (!res.success) {
          this.errorMsg = res.message;
        }
      }))
      .pipe(switchMap(() => this.apiService.getFragment(fragmentName)))
      .subscribe(res => {
        this.fragment = res;
        this.tests = res.tests || [];
        this.successMsg = 'Test deleted successfully.';
        this.showAlert = true;
        this.deleting = false;
        $sub.unsubscribe();
      });
  }

  uploadFiles(e: Event): void {
    if (!this.fragment) {
      this.errorMsg = 'Unknown fragment. Application error';
      this.showAlert = true;
      return;
    }

    const target = e.target as HTMLInputElement;
    const files = target.files;

    if (!files || files.length === 0) {
      return;
    }

    this.uploading = true;
    const fragmentName = this.fragment.name;
    const $observables: Observable<ApiResult<string>>[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files.item(i);

      if (!file) {
        continue;
      }

      $observables.push(this.apiService.uploadFile(fragmentName, file));
    }

    const $sub = forkJoin($observables)
      .pipe(tap(results => {
        const success = results.reduce((prev, current) => prev && current.success, true);

        if (!success) {
          this.errorMsg = results.map(res => res.message).filter(m => !!m).join('\n');
        } else {
          this.successMsg = 'Files uploaded successfully';
        }
      }))
      .pipe(switchMap(() => this._initFiles(fragmentName)))
      .subscribe(() => {
        this.showAlert = true;
        this.uploading = false;
        $sub.unsubscribe();
      });
  }

  private _initFragment(): void {
    this.apiService.$loading.next(true);

    const $sub = this._route.params
      .pipe(filter((p: FragmentDetailParams) => p.fragmentName))
      .pipe(switchMap((p: FragmentDetailParams) =>
        this.apiService.getFragment(p.fragmentName)
          .pipe(tap((result) => {
            this.fragment = result;
            this.tests = result?.tests || [];
          }))
      ))
      .pipe(switchMap((fragment: Fragment) =>
        this._initFiles(fragment.name)
      ))
      .pipe(catchError(err => {
        this.showAlert = true;
        this.errorMsg = err;
        return of(undefined);
      }))
      .subscribe(() => {
        this.apiService.$loading.next(false);
        $sub.unsubscribe();
      });
  }

  private _initFiles(fragmentName: string): Observable<ContentFile[]> {
    return this.apiService.listFiles(fragmentName)
      .pipe(tap((files) => {
        this.fragmentFiles = files.map(f => f.name);
      }));
  }
}
