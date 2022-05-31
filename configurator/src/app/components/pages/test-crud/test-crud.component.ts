import { Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services';
import {
  catchError,
  concat,
  EMPTY,
  lastValueFrom,
  Observable,
  of,
  Subscription,
  switchMap,
  tap,
  throwError,
  toArray, zip
} from 'rxjs';
import {
  ApiResult,
  ContentFile,
  DataSpec,
  EditFragmentTestParams,
  FileInputFormGroup, FileInputFormGroupSpec, Fragment,
  RecursivePartial,
  TestDetail,
  TestDetailForm,
  TestType
} from '../../../models';
import { TypedFormArray, TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { FILE_TYPES, TEST_TYPE_DEFINITIONS } from '../../../constants';
import { DialogService } from 'primeng/dynamicdialog';
import { SelectFileComponent } from '../../modals';
import { markAllAsTouchedOrDirty } from '../../../utils';


@Component({
  selector: 'config-test-crud',
  templateUrl: './test-crud.component.html',
  styleUrls: ['./test-crud.component.scss'],
  providers: [DialogService]
})
export class TestCrudComponent implements OnDestroy {

  fragment?: Fragment;
  test?: TestDetail;
  initErrorMsg?: string;
  fg: TypedFormGroup<TestDetailForm>;
  dataFgs: FileInputFormGroupSpec[];
  queryFg: FileInputFormGroupSpec[];
  saved?: boolean;
  savedTest?: TestDetail;
  showAlert = false;
  saveErrorMsg?: string;
  rows: string[] = [''];
  testTypes = TEST_TYPE_DEFINITIONS;


  private _fragmentsSub?: Subscription;


  constructor(private _route: ActivatedRoute, private _apiService: ApiService, private _dialogService: DialogService) {
    this.fg = new TypedFormGroup<TestDetailForm>({
      type: new TypedFormControl<TestType>('COMPETENCY_QUESTION'),
      content: new TypedFormControl<string>(),
      query: new TypedFormGroup<FileInputFormGroup>({
        fileName: new TypedFormControl<string>(),
        file: new TypedFormControl<FileList>(),
        content: new TypedFormControl<string>()
      }),
      data: new TypedFormGroup<FileInputFormGroup>({
        fileName: new TypedFormControl<string>(),
        file: new TypedFormControl<FileList>()
      }),
      expectedResults: new TypedFormGroup<FileInputFormGroup>({
        fileName: new TypedFormControl<string>(),
        file: new TypedFormControl<FileList>()
      }),
      dataContent: new TypedFormGroup<TestDetailForm['dataContent']>({
        prefixes: new TypedFormControl<string>(),
        rows: new TypedFormArray<DataSpec>([])
      })
    });


    this.queryFg = this._initQueryFgs();
    this.dataFgs = this._initDataFgs();

    this._init();
  }

  ngOnDestroy(): void {
    this._fragmentsSub?.unsubscribe();
  }

  onTypeSelect(): void {
    const expectedResultsControls = this.fg.controls.expectedResults.controls;

    this.queryFg = this._initQueryFgs();
    this.dataFgs = this._initDataFgs();

    if (this.fg.controls.type.value !== 'ERROR_PROVOCATION') {
      expectedResultsControls.file.enable();
      expectedResultsControls.fileName.enable();
      return;
    }

    expectedResultsControls.file.disable();
    expectedResultsControls.file.reset();

    expectedResultsControls.fileName.disable();
    expectedResultsControls.fileName.reset();


    // noinspection UnnecessaryLocalVariableJS
    const arrayControls = this.fg.controls.dataContent.controls.rows.controls;

    for (const row of arrayControls || []) {
      const fgControls = row?.controls || {};

      if (fgControls.expectedResult) {
        fgControls.expectedResult.patchValue(false);
      }
    }
  }

  resetDataAndExpectedResults(): void {
    const dataContentControls = this.fg.controls.dataContent.controls;

    this.fg.controls.expectedResults.reset();
    this.fg.controls.data.reset();
    dataContentControls.prefixes.reset();
    dataContentControls.rows = new TypedFormArray<DataSpec>([]);
  }

  selectFile(fg: FileInputFormGroupSpec): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragmentName: this.fragment?.name
      },
      header: `Select existing ${fg.label.toLowerCase()}`,
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: ContentFile) => {
      fg.formGroup.patchValue({
        content: '',
        file: undefined,
        fileName: file.name
      });

      $sub.unsubscribe();
    });
  }

  save(): void {
    if (!this.fragment) {
      return;
    }

    if (!this.fg.valid) {
      markAllAsTouchedOrDirty(this.fg);
      markAllAsTouchedOrDirty(this.fg, true);
      return;
    }

    this._toggleDisable();

    let $queryFileUpload: Observable<ApiResult<string>> = of({success: true});
    let $dataFileUpload: Observable<ApiResult<string>> = of({success: true});
    let $expectedResultsFileUpload: Observable<ApiResult<string>> = of({success: true});

    const formValue = this.fg.value;

    if (!formValue) {
      return;
    }

    const updateValue: Omit<TestDetail, 'id'> = {
      type: formValue.type || 'INFERENCE_VERIFICATION',
      content: formValue.content || '',
    };


    if (formValue.query.file?.length || formValue.query.fileName) {
      $queryFileUpload = this._apiService.uploadFile(formValue.query.file[0], 'query', this.fragment);
      updateValue.queryFileName = this.fragment.ontologyName + this.fragment.name +
        `/${FILE_TYPES['query']}/` +
        (formValue.query.file?.[0]?.name || formValue.query.fileName);

    } else if (formValue?.query) {
      updateValue.query = formValue.query.content;
    }


    if (formValue.expectedResults.file?.length || formValue.expectedResults.fileName) {
      $expectedResultsFileUpload = this._apiService.uploadFile(
        formValue.expectedResults.file[0],
        'expectedResults',
        this.fragment
      );

      updateValue.expectedResultsFileName = this.fragment.ontologyName + this.fragment.name +
        `/${FILE_TYPES['expectedResults']}/` +
        (formValue.expectedResults.file?.[0]?.name || formValue.expectedResults.fileName);
    }


    if (formValue.data.file?.length || formValue.data.fileName) {
      $dataFileUpload = this._apiService.uploadFile(formValue.data.file[0], 'dataset', this.fragment);
      updateValue.dataFileName = this.fragment.ontologyName + this.fragment.name +
        `/${FILE_TYPES['dataset']}/` +
        (formValue.data.file?.[0]?.name || formValue.data.fileName);

    } else if (formValue.dataContent.rows.length) {
      updateValue.data = (formValue.dataContent.prefixes || '') + '\n\n';
      updateValue.expectedResults = (formValue.dataContent.prefixes || '') + '\n\n';

      for (const r of formValue.dataContent.rows) {
        const data = `${r.subject} ${r.predicate} ${r.object}\n`;
        updateValue.data += data;

        if (r.expectedResult) {
          updateValue.expectedResults += data;
        }
      }
    }

    lastValueFrom(concat(
      $queryFileUpload.pipe(tap((res) => updateValue.queryFileName = res.data ? (this.fragment!.ontologyName + this.fragment!.name + `/${FILE_TYPES['query']}/` + + res.data) : '')),
      $dataFileUpload.pipe(tap((res) => updateValue.dataFileName = res.data ? (this.fragment!.ontologyName + this.fragment!.name + `/${FILE_TYPES['dataset']}/` + res.data) : '')),
      $expectedResultsFileUpload.pipe(tap((res) => updateValue.expectedResultsFileName = res.data ? (this.fragment!.ontologyName + this.fragment!.name + `/${FILE_TYPES['expectedResults']}/` + res.data) : ''))
    ).pipe(toArray())
      .pipe(switchMap((results: ApiResult<string>[]) => {
        const success = results.reduce((prev, current) => prev && current.success, true);
        if (!success) {
          return throwError(() => results.map(r => r.message).filter(m => !!m).join('\n'));
        }

        return this._apiService.updateFragmentTest(this.fragment?.name || '', updateValue, this.test?.id);
      })
    )).finally(() => this._toggleDisable())
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


  private _toggleDisable(): void {
    if (this.fg.disabled) {
      this.fg.disable();
    } else {
      this.fg.enable();
    }
  }


  private _init(): void {
    const $fragment: Observable<Fragment> =  this._route.params
      .pipe(switchMap((p: EditFragmentTestParams) => {
        if (!p.fragmentName) {
          return throwError(() => 'Empty fragment name');
        }
        return this._apiService.getFragment(p.fragmentName);
      }));

    const $test: Observable<TestDetail | undefined> = this._route.params
      .pipe(switchMap((p: EditFragmentTestParams) => {
        if (p.testId) {
          return this._apiService.getFragmentTest(p.fragmentName, p.testId);
        }

        return of(undefined);
      }));

    this._fragmentsSub = zip($fragment, $test)
      .pipe(catchError(err => {
        this.initErrorMsg = err;
        return EMPTY;
      }))
      .subscribe(([fragment, testDetail]) => {
        this.fragment = fragment;
        this.test = testDetail;

        if (testDetail) {
          this._updateFormGroup(testDetail);
        }
      });
  }


  private _updateFormGroup(test: TestDetail): void {
    const [prefixes, data] = (test.data || '\n\n').split(/\r?\n{2}/);
    const rows: RecursivePartial<DataSpec>[] = data.split(/\r?\n/).filter(r => !!r.trim()).map((r) => {
      const expectedResult = test.expectedResults?.includes(r) || false;
      const [subject, predicate, object, graph] = r.split(' ');
      return { expectedResult, subject, predicate, object, graph };
    });

    this.fg.patchValue({
      content: test.content,
      type: test.type,
      query: {content: test.query, fileName: test.queryFileName},
      data: {fileName: test.dataFileName},
      expectedResults: {fileName: test.expectedResultsFileName},
      dataContent: {prefixes, rows},
    });


    this.queryFg = this._initQueryFgs();
    this.dataFgs = this._initDataFgs();
  }

  private _initQueryFgs(): FileInputFormGroupSpec[] {
    const type: TestType = this.fg.controls.type.value;
    let label = 'Query';
    const placeholder = 'SELECT DISTINCT ?Concept WHERE {[] a ?Concept} ';

    switch (type) {
      case 'COMPETENCY_QUESTION':
        label = 'SELECT SPARQL Query';
        break;

      case 'INFERENCE_VERIFICATION':
        label = 'ASK SPARQL Query';
        break;
    }

    return [{
      label,
      formGroup: this.fg.controls.query,
      placeholder
    }];
  }

  private _initDataFgs(): FileInputFormGroupSpec[] {
    const type: TestType = this.fg.controls.type.value;
    const result: FileInputFormGroupSpec[] = [{
      label: 'Sample dataset' + (type === 'ERROR_PROVOCATION' ? ' with errors' : ''),
      formGroup: this.fg.controls.data
    }];

    if (type !== 'ERROR_PROVOCATION') {
      result.push({
        label: 'Expected results',
        formGroup: this.fg.controls.expectedResults
      });
    }

    console.log(type, result);
    return result;
  }
}
