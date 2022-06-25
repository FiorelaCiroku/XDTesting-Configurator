import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ContentFile, FileTypes,
  Fragment,
  FragmentDetailParams,
  FragmentFile,
  TestDetail,
  TestStatus,
  TestType
} from '../../../models';
import { ApiService } from '../../../services';
import { catchError, filter, Observable, of, switchMap, tap } from 'rxjs';
import { FILE_TYPES, TEST_TYPE_DEFINITIONS } from '../../../constants';
import { Table } from 'primeng/table';
import { DialogService } from 'primeng/dynamicdialog';
import { UploadFragmentFileComponent } from '../../modals';
import { TextDetailsComponent } from '../../modals/text-details/text-details.component';

@Component({
  selector: 'config-fragment-detail',
  templateUrl: './fragment-detail.component.html',
  styleUrls: ['./fragment-detail.component.scss'],
  providers: [DialogService]
})
export class FragmentDetailComponent {

  fragment?: Fragment;
  errorMsg?: string;
  successMsg?: string;
  testTypes = TEST_TYPE_DEFINITIONS;
  tests: TestDetail[] = [];
  showAlert = false;
  deleting = false;
  fragmentFiles: FragmentFile[] = [];
  uploading = false;
  statusOptions: Array<{icon: string; value: TestStatus}>;
  statusIcons: {[k in TestStatus]: string};

  // gets table and table filter elements' class instance
  @ViewChild('table', {read: Table}) table?: Table;
  @ViewChild('tableFilter', {read: ElementRef}) tableFilter?: ElementRef<HTMLInputElement>;

  constructor(private _route: ActivatedRoute, public apiService: ApiService, public dialogService: DialogService) {
    this._initFragment();

    this.statusIcons = {
      failed: 'fa-solid fa-circle-xmark text-danger',
      success: 'fa-solid fa-circle-check text-success',
      error: 'fa-solid fa-triangle-exclamation text-warning',
      running: 'fa-solid fa-rotate fa-spin text-secondary',
    };

    this.statusOptions = Object.entries(this.statusIcons).map(([status, icon]) => ({
      icon,
      value: status as TestStatus
    }));
  }

  /**
   * Helper to get test type label
   * @param testType
   * @returns Label for test type
   */
  testLabel(testType: TestType): string {
    return this.testTypes[testType].label;
  }


  /**
   * Clears table's filters
   * @param table table on which to operate
   */
  clear(table: Table): void {
    table.clear();
    if (this.tableFilter?.nativeElement) {
      this.tableFilter.nativeElement.value = '';
    }
  }

  /**
   * Performs free-text table filter
   * @param e Search event
   */
  filterContent(e: Event): void {
    const input = e?.target as HTMLInputElement;

    if (!input) {
      return;
    }

    this.table?.filterGlobal(input.value, 'contains');
  }

  /**
   * Deletes a test from a fragment. It doesn't delete associated files
   * @param testId Fragment test id
   */
  deleteTest(testId: string): void {
    // Browser confirmation before actually performing deletion
    if (!confirm('Are you sure? Test data will be removed but files associated to it won\'t be deleted')) {
      return;
    }

    // Check fragment has been initialized.
    // Should never enter in `if`.
    if (!this.fragment) {
      this.errorMsg = 'Unknown fragment. Application error';
      this.showAlert = true;
      return;
    }

    const fragment = this.fragment;
    this.deleting = true;

    // delete test and show alert
    const $sub = this.apiService.deleteTestFromFragment(fragment, testId)
      .pipe(tap((res) => {
        if (!res.success) {
          this.errorMsg = res.message;
        }
      }))
      .pipe(switchMap(() => this.apiService.getFragment(fragment.name, fragment.ontologyName)))
      .subscribe(res => {
        this.fragment = res;
        this.tests = res.tests || [];
        this.successMsg = 'Test deleted successfully.';
        this.showAlert = true;
        this.deleting = false;
        $sub.unsubscribe();
      });
  }

  /**
   * Opens modal to upload file for fragment
   */
  uploadFiles(): void {
    const ref = this.dialogService.open(UploadFragmentFileComponent, {
      header: 'Upload a new file',
      data: {
        fragment: this.fragment
      }
    });

    const $sub = ref.onClose.subscribe(() => {
      if (this.fragment) {
        // re-initialize page after modal closes
        this._initFiles();
      }

      $sub.unsubscribe();
    });
  }

  /**
   * Initialize page.
   * Downloads fragment and related files data
   */
  private _initFragment(): void {
    const $sub = this._route.params
      .pipe(filter((p: FragmentDetailParams) => p.fragmentName))
      .pipe(switchMap((p: FragmentDetailParams) => {
        const [ontologyName, fragmentName] = p.fragmentName.split('_');
        return this.apiService.getFragment(fragmentName, ontologyName)
          .pipe(tap((result) => {
            this.fragment = result;
            this.tests = result?.tests || [];
          }));
      }))
      .pipe(switchMap(() =>
        this._initFiles()
      ))
      .pipe(catchError(err => {
        this.showAlert = true;
        this.errorMsg = err;
        return of(undefined);
      }))
      .subscribe(() => {
        $sub.unsubscribe();
      });
  }

  /**
   * Downloads fragment files data
   * @returns Observable of fragment-related files
   */
  private _initFiles(): Observable<ContentFile[]> {
    return this.apiService.listTestFiles(this.fragment)
      .pipe(tap((files) => {
        const fileTypes = Object.entries(FILE_TYPES);
        this.fragmentFiles = [];
        this.fragmentFiles = files.map(f => {
          const nameChunks = f.name.split('.');
          const extension = nameChunks.splice(-1, 1)[0];
          const pathChunks = f.path.split('/');
          let fileType: FileTypes = 'query';

          for (const [ft, spec] of fileTypes) {
            if (spec.folder === pathChunks[pathChunks.length - 2]) {
              fileType = ft as FileTypes;
            }
          }

          return {
            name: nameChunks.join('.'),
            extension,
            type: fileType,
            path: f.path
          };
        });
      }));
  }

  /**
   * Opens a modal to display notes for test
   * @param test
   */
  testNotes(test: TestDetail): void {
    this.dialogService.open(TextDetailsComponent, {
      header: `Status notes for test ${test.id}`,
      data: {
        notes: test.statusNotes
      }
    });
  }
}
