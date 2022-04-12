import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services';
import {
  catchError,
  combineLatest,
  concat,
  filter,
  lastValueFrom,
  Observable,
  of,
  Subscription,
  switchMap, tap,
  throwError,
  toArray
} from 'rxjs';
import {
  ApiResult,
  ContentFile,
  DataSpec,
  EditTestParams,
  Fragment,
  TestDetail,
  TestDetailForm,
  TestType
} from '../../models';
import { TypedFormArray, TypedFormControl, TypedFormGroup } from '../../utils/typed-form';
import { TEST_TYPE_DEFINITIONS } from '../../constants';
import { DialogService } from 'primeng/dynamicdialog';
import { SelectFileComponent } from '../select-file/select-file.component';


@Component({
  selector: 'config-edit-test',
  templateUrl: './edit-test.component.html',
  styleUrls: ['./edit-test.component.scss'],
  providers: [DialogService]
})
export class EditTestComponent implements OnDestroy {

  fragmentName?: string;
  test?: TestDetail;
  initErrorMsg?: string;
  formGroup?: TypedFormGroup<TestDetailForm>;
  ids?: string[];
  saved?: boolean;
  savedTest?: TestDetail;
  showAlert = false;
  saveErrorMsg?: string;
  rows: string[] = [''];
  testTypes = TEST_TYPE_DEFINITIONS;
  uploadQuery = false;
  uploadFile = false;
  useUploadedDataAndResults = false;
  useUploadedQuery = false;
  dataRows?: TypedFormGroup<DataSpec>[];

  private _fragmentsSub?: Subscription;


  constructor(private _route: ActivatedRoute, private _apiService: ApiService, private _dialogService: DialogService) {
    this._init();
  }

  ngOnDestroy(): void {
    this._fragmentsSub?.unsubscribe();
  }

  onTypeSelect(): void {
    if (this.formGroup?.controls?.type?.value !== 'ERROR_PROVOCATION') {
      return;
    }

    this.formGroup?.controls.expectedResultsFile?.reset();
    this.formGroup?.controls.expectedResultsFileName?.reset();


    // noinspection UnnecessaryLocalVariableJS
    const arrayControls = (
      (
        this.formGroup?.controls?.data as TypedFormGroup<TestDetailForm['data']>
      )
        ?.controls?.rows as TypedFormArray<DataSpec>
    )
      ?.controls;

    for (const row of arrayControls) {
      const fgControls = (row as TypedFormGroup<DataSpec>)?.controls || {};
      fgControls.expectedResult?.patchValue(false);
    }
  }

  onToggleUploadData(): void {
    const dataFg = this.formGroup?.controls.data as TypedFormGroup<TestDetailForm['data']> | undefined;
    const prefixesControl = dataFg?.controls?.prefixes;
    const rows = (dataFg?.controls?.rows as TypedFormArray<DataSpec> | undefined);

    this.formGroup?.controls.dataFile?.reset();
    this.formGroup?.controls.dataFileName?.reset();
    this.formGroup?.controls.expectedResultsFile?.reset();
    this.formGroup?.controls.expectedResultsFileName?.reset();
    prefixesControl?.reset();
    rows?.clear();

    if (this.uploadFile) {
      this.formGroup?.controls.dataFile?.enable();
      this.formGroup?.controls.dataFileName?.disable();
      prefixesControl?.disable();
      rows?.disable();

    } else if (this.useUploadedDataAndResults) {
      this.formGroup?.controls.dataFileName?.enable();
      this.formGroup?.controls.dataFile?.disable();
      prefixesControl?.disable();
      rows?.disable();

    } else {
      prefixesControl?.enable();
      rows?.enable();
      this.formGroup?.controls.dataFileName?.disable();
      this.formGroup?.controls.dataFile?.disable();
    }
  }

  onToggleUploadQuery(): void {
    this.formGroup?.controls.query?.reset();
    this.formGroup?.controls.queryFile?.reset();
    this.formGroup?.controls.queryFileName?.reset();

    if (this.uploadQuery) {
      this.formGroup?.controls.queryFile?.enable();
      this.formGroup?.controls.query?.disable();
      this.formGroup?.controls.queryFileName?.disable();

    } else if (this.useUploadedQuery) {
      this.formGroup?.controls.queryFileName?.enable();
      this.formGroup?.controls.query?.disable();
      this.formGroup?.controls.queryFile?.disable();

    } else {
      this.formGroup?.controls.query?.enable();
      this.formGroup?.controls.queryFileName?.disable();
      this.formGroup?.controls.queryFile?.disable();
    }
  }

  addDataRow(): void {
    const dataFg = this.formGroup?.controls.data as TypedFormGroup<TestDetailForm['data']> | undefined;
    const formArray = dataFg?.controls?.rows as TypedFormArray<DataSpec> | undefined;

    if (!formArray) {
      return;
    }

    const formGroup = new TypedFormGroup<DataSpec>({
      expectedResult: new TypedFormControl<boolean>(false),
      subject: new TypedFormControl<string>(''),
      object: new TypedFormControl<string>(''),
      predicate: new TypedFormControl<string>(''),
      graph: new TypedFormControl<string | undefined>()
    });

    formArray.push(formGroup);
  }

  removeDataRow(i: number): void {
    const dataFg = this.formGroup?.controls.data as TypedFormGroup<TestDetailForm['data']>;
    const formArray = dataFg.controls?.rows as TypedFormArray<DataSpec>;

    if (!formArray) {
      return;
    }

    formArray.removeAt(i);
  }

  selectQueryFile(): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragmentName: this.fragmentName
      },
      header: 'Select uploaded query file',
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: ContentFile) => {
      this.formGroup?.controls.queryFileName?.patchValue(file.name);
      $sub.unsubscribe();
    });
  }

  selectDataFile(): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragmentName: this.fragmentName
      },
      header: 'Select uploaded data file',
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: ContentFile) => {
      this.formGroup?.controls.dataFileName?.patchValue(file.name);
      $sub.unsubscribe();
    });
  }

  selectExpectedResultsFile(): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragmentName: this.fragmentName
      },
      header: 'Select uploaded expected results file',
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: ContentFile) => {
      this.formGroup?.controls.expectedResultsFileName?.patchValue(file.name);
      $sub.unsubscribe();
    });
  }

  save(): void {
    if (!this.formGroup || !this.fragmentName) {
      return;
    }

    if (!this.formGroup.valid) {
      for (const control of Object.values(this.formGroup.controls)) {
        control.markAsTouched();
        control.markAsDirty();
      }

      const dataFg = this.formGroup.controls.data as TypedFormGroup<TestDetailForm['data']>;

      for (const control of Object.values(dataFg.controls || {})) {
        control.markAsTouched();
        control.markAsDirty();
      }

      return;
    }

    let $queryFileUpload: Observable<ApiResult<string>> = of({success: true});
    let $dataFileUpload: Observable<ApiResult<string>> = of({success: true});
    let $expectedResultsFileUpload: Observable<ApiResult<string>> = of({success: true});
    const formValue = this.formGroup.value;


    const updateValue: Omit<TestDetail, 'id'> = {
      type: formValue?.type || 'GENERAL_CONSTRAINT',
      content: formValue?.content || '',
    };


    if (formValue?.queryFile || formValue?.queryFileName) {
      updateValue.queryFileName = this.fragmentName + '/' + (formValue?.queryFile?.[0]?.name || formValue?.queryFileName);

      if (formValue?.queryFile?.length) {
        $queryFileUpload = this._apiService.uploadFile(this.fragmentName, formValue.queryFile[0]);
      }

    } else if (formValue?.query) {
      updateValue.query = formValue.query;
    }


    if (formValue?.expectedResultsFile?.length || formValue?.expectedResultsFileName) {
      updateValue.expectedResultsFileName = this.fragmentName + '/' + (formValue?.expectedResultsFile?.[0]?.name || formValue?.expectedResultsFileName);

      if (formValue?.expectedResultsFile?.length) {
        $expectedResultsFileUpload = this._apiService.uploadFile(this.fragmentName, formValue?.expectedResultsFile[0]);
      }
    }


    if (formValue?.dataFile?.length || formValue?.dataFileName) {
      updateValue.dataFileName = this.fragmentName + '/' + (formValue?.dataFile?.[0]?.name || formValue?.dataFileName);

      if (formValue?.dataFile?.length) {
        $dataFileUpload = this._apiService.uploadFile(this.fragmentName, formValue.dataFile[0]);
      }
    } else if (formValue?.data?.rows && formValue.data.rows.length > 0) {
      updateValue.data = (formValue.data.prefixes + '\n\n') || '';
      updateValue.expectedResults = (formValue.data.prefixes + '\n\n') || '';

      for (const r of formValue.data.rows) {
        const data = `${r.subject} ${r.predicate} ${r.object}\n`;
        updateValue.data += data;

        if (r.expectedResult) {
          updateValue.expectedResults += data;
        }
      }
    }

    this._toggleDisableInputs(true);

    lastValueFrom(
      concat(
        $queryFileUpload
          .pipe(tap((res) => {
            if (res.data) {
              updateValue.queryFileName = this.fragmentName + '/' + res.data;
            }
          })),
        $dataFileUpload
          .pipe(tap((res) => {
            if (res.data) {
              updateValue.dataFileName = this.fragmentName + '/' + res.data;
            }
          })),
        $expectedResultsFileUpload
          .pipe(tap((res) => {
            if (res.data) {
              updateValue.expectedResultsFileName = this.fragmentName + '/' + res.data;
            }
          }))
      )
        .pipe(toArray())
        .pipe(switchMap((results: ApiResult<string>[]) => {
          const success = results.reduce((prev, current) => prev && current.success, true);

          if (!success) {
            return throwError(() => results.map(r => r.message).filter(m => !!m).join('\n'));
          }

          return this._apiService.updateFragmentTest(this.fragmentName || '', updateValue, this.test?.id);
        })
      )
    )
      .finally(() => {
        this._toggleDisableInputs(false);
      })
      .then(result => {
        this.saved = result.success;
        this.saveErrorMsg = result.message;
        this.showAlert = true;
        this.savedTest = result.data;
      })
      .catch(err => {
        this.saveErrorMsg = err;
        this.showAlert = true;
      });

  }

  private _toggleDisableInputs(disable: boolean): void {
    const controls = this.formGroup?.controls;
    const dataFgControls = (controls?.data as TypedFormGroup<TestDetailForm['data']>)?.controls;
    const arrayControls = (dataFgControls?.rows as TypedFormArray<DataSpec>)?.controls;

    if (!controls) {
      return;
    }

    for (const c of Object.values(controls)) {
      if (disable) {
        c.disable();
      } else {
        c.enable();
      }
    }

    if (dataFgControls) {
      for (const c of Object.values(dataFgControls)) {
        if (disable) {
          c.disable();
        } else {
          c.enable();
        }
      }
    }

    if (arrayControls) {
      for (const row of arrayControls) {
        const fgControls = (row as TypedFormGroup<DataSpec>)?.controls || {};

        for (const c of Object.values(fgControls)) {
          if (disable) {
            c.disable();
          } else {
            c.enable();
          }
        }
      }
    }
  }


  private _init(): void {
    this._fragmentsSub = this._route.params
      .pipe(filter((p: EditTestParams) => p.fragmentName))
      .pipe(switchMap((p: EditTestParams) => {
        this._apiService.$loading.next(true);

        return combineLatest([
          of(p),
          this._apiService.getFragment(p.fragmentName),
        ]);
      }))
      .pipe(catchError(err => {
        this.initErrorMsg = err;
        return of([undefined, undefined]);
      }))
      .subscribe(([params, result]: [EditTestParams, Fragment] | undefined[]) => {
        this.fragmentName = params?.fragmentName;

        if (params && result && params.testId) {
          const filteredTest = result.tests?.filter(t => t.id === params.testId);
          this.ids = result.tests?.map(t => t.id);

          if (!filteredTest || filteredTest.length === 0) {
            this.initErrorMsg = 'No test found with the specified id';

          } else {
            this.test = filteredTest[0];
          }
        }

        if (!this.initErrorMsg) {
          this._createFormGroup();
        }

        this._apiService.$loading.next(false);
      });
  }

  private _createFormGroup(): void {
    let dataRows: TypedFormGroup<DataSpec>[] = [];

    if (this.test?.data) {
      dataRows = this.test.data.split(/\r?\n/).map(row => {
        const chunks: string[] = row.split(' ');

        return new TypedFormGroup<DataSpec>({
          expectedResult: new TypedFormControl<boolean>(this.test?.expectedResults?.includes(row)),
          subject: new TypedFormControl<string>(chunks[0] || ''),
          object: new TypedFormControl<string>(chunks[1] || ''),
          predicate: new TypedFormControl<string>(chunks[2] || ''),
          graph: new TypedFormControl<string | undefined>(chunks[3])
        });
      });
    } else if (this.test?.dataFileName) {
      this.useUploadedDataAndResults = true;
    }

    if (this.test?.queryFileName) {
      this.uploadQuery = true;
    }

    this.formGroup = new TypedFormGroup<TestDetailForm>({
      type: new TypedFormControl<TestType>(this.test?.type || 'COMPETENCY_QUESTION'),
      content: new TypedFormControl<string>(this.test?.content || ''),
      query: new TypedFormControl<string | undefined>(this.test?.query),
      queryFile: new TypedFormControl<FileList | undefined>(),
      queryFileName: new TypedFormControl<string | undefined>(this.test?.queryFileName),
      data: new TypedFormGroup<TestDetailForm['data']>({
        prefixes: new TypedFormControl<string>(''),
        rows: new TypedFormArray<DataSpec>(dataRows),
      }),
      dataFile: new TypedFormControl<FileList | undefined>(),
      dataFileName: new TypedFormControl<string | undefined>(this.test?.dataFileName),
      expectedResultsFile:  new TypedFormControl<FileList | undefined>(),
      expectedResultsFileName: new TypedFormControl<string | undefined>(this.test?.expectedResultsFileName),
    });

    const dataFg = this.formGroup.controls.data as TypedFormGroup<TestDetailForm['data']>;
    const dataArr = dataFg.controls?.rows as TypedFormArray<DataSpec>;
    this.dataRows = dataArr.controls as TypedFormGroup<DataSpec>[];
  }
}
