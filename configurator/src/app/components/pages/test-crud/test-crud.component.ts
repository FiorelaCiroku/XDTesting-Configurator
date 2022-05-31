import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
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
  DataSpec,
  EditFragmentTestParams,
  FileInputFormGroup, FileInputFormGroupSpec, Fragment, FragmentFile,
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
import { Summary } from '../../shared/summary/summary.component';


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
  dataFg!: FileInputFormGroupSpec;
  expectedResultFg?: FileInputFormGroupSpec;
  queryFg!: FileInputFormGroupSpec;
  saved?: boolean;
  savedTestSummary?: Summary[];
  showAlert = false;
  saveErrorMsg?: string;
  testTypes = TEST_TYPE_DEFINITIONS;

  useDataFile = false;
  useExpectedResultsFile = false;


  @ViewChild('alert', {read: ElementRef}) alert!: ElementRef<HTMLElement>;


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

    this._init();
    this._initFormGroupSpecs();
  }

  ngOnDestroy(): void {
    this._fragmentsSub?.unsubscribe();
  }

  onTypeSelect(): void {
    this._initFormGroupSpecs();

    const topControls = this.fg.controls;
    topControls.query.reset();
    topControls.data.reset();
    topControls.expectedResults.reset();
    topControls.dataContent.reset();
  }

  resetDataAndExpectedResults(which: 'data' | 'expectedResults', checked: boolean): void {
    const dataContentControls = this.fg.controls.dataContent.controls;

    this.fg.controls.expectedResults.reset();
    this.fg.controls.data.reset();
    dataContentControls.prefixes.reset();
    dataContentControls.rows = new TypedFormArray<DataSpec>([]);

    if (which === 'data') {
      this.useDataFile = checked;
    } else {
      this.useExpectedResultsFile = checked;
    }
  }

  selectFile(fg: FileInputFormGroupSpec): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragment: this.fragment
      },
      header: `Select existing ${fg.label.toLowerCase()}`,
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: FragmentFile) => {
      fg.formGroup.patchValue({
        content: '',
        file: undefined,
        fileName: `${file.name}.${file.extension}`
      });

      console.log({fg, val: this.fg.value});
      $sub.unsubscribe();
    });
  }

  save(): void {
    if (!this.fragment) {
      return;
    }

    this.saveErrorMsg = undefined;

    if (!this.fg.valid) {
      markAllAsTouchedOrDirty(this.fg);
      markAllAsTouchedOrDirty(this.fg, true);
      this.saveErrorMsg = 'Missing required fields';
      this.showAlert = true;
      this.alert.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      return;
    }

    const errored = this._checkRequired();

    if ((Array.isArray(errored) && errored.length > 0) || errored === false) {
      if ((Array.isArray(errored) && errored.length > 0)) {
        this.saveErrorMsg = `Missing Required field${errored.length === 1 ? '' : 's'} "${errored.join('", "')}"`;
      } else if (errored === false) {
        this.saveErrorMsg = 'Error during save';
      }

      this.showAlert = true;
      this.alert.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      $queryFileUpload = this._apiService.uploadFile(formValue.query.file?.[0], 'query', this.fragment);
      updateValue.queryFileName = this.fragment.ontologyName + '/' + this.fragment.name +
        `/${FILE_TYPES['query'].folder}/` +
        (formValue.query.file?.[0]?.name || formValue.query.fileName);

    } else if (formValue?.query) {
      updateValue.query = formValue.query.content;
    }


    if (formValue.expectedResults.file?.length || formValue.expectedResults.fileName) {
      $expectedResultsFileUpload = this._apiService.uploadFile(
        formValue.expectedResults.file?.[0],
        'expectedResults',
        this.fragment
      );

      updateValue.expectedResultsFileName = this.fragment.ontologyName + '/' + this.fragment.name +
        `/${FILE_TYPES['expectedResults'].folder}/` +
        (formValue.expectedResults.file?.[0]?.name || formValue.expectedResults.fileName);
    }


    if (formValue.data.file?.length || formValue.data.fileName) {
      $dataFileUpload = this._apiService.uploadFile(formValue.data.file?.[0], 'dataset', this.fragment);
      updateValue.dataFileName = this.fragment.ontologyName + '/' + this.fragment.name +
        `/${FILE_TYPES['dataset'].folder}/` +
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
        this._buildSummary(result.data);
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

    const formArray = this.fg.controls.dataContent.controls.rows;

    for (let i = 0; i < rows.length; i++) {
      formArray.push(new TypedFormGroup<DataSpec>({
        expectedResult: new TypedFormControl<boolean>(false),
        subject: new TypedFormControl<string>(''),
        object: new TypedFormControl<string>(''),
        predicate: new TypedFormControl<string>(''),
        graph: new TypedFormControl<string | undefined>()
      }));
    }

    this.fg.patchValue({
      content: test.content,
      type: test.type,
      query: {content: test.query, fileName: test.queryFileName},
      data: {fileName: test.dataFileName},
      expectedResults: {fileName: test.expectedResultsFileName},
      dataContent: {prefixes, rows},
    });

    this._initFormGroupSpecs();
  }

  private static _getQueryLabel(type: TestType): string {
    switch (type) {
      case 'COMPETENCY_QUESTION':
        return 'SELECT SPARQL Query';

      case 'INFERENCE_VERIFICATION':
        return 'ASK SPARQL Query';
    }

    return 'Query';
  }

  private _initFormGroupSpecs(): void {
    this.queryFg = this._initQueryFg();
    this.dataFg = this._initDataFg();
    this.expectedResultFg = this._initExpectedResultsFg();
  }

  private _initQueryFg(): FileInputFormGroupSpec {
    const label = TestCrudComponent._getQueryLabel(this.fg.controls.type.value);
    const placeholder = 'SELECT DISTINCT ?Concept WHERE {[] a ?Concept}';

    return {
      label,
      formGroup: this.fg.controls.query,
      placeholder
    };
  }

  private _initDataFg(): FileInputFormGroupSpec {
    const type: TestType = this.fg.controls.type.value;

    return {
      label: 'Sample dataset' + (type === 'ERROR_PROVOCATION' ? ' with errors' : ''),
      formGroup: this.fg.controls.data
    };
  }

  private _initExpectedResultsFg(): FileInputFormGroupSpec | undefined {
    const type: TestType = this.fg.controls.type.value;

    if (type !== 'COMPETENCY_QUESTION') {
      return undefined;
    }

    return {
      label: 'Expected results',
      formGroup: this.fg.controls.expectedResults
    };
  }

  private _checkRequired(): string[] | boolean {
    if (!this.fg.value) {
      return false;
    }

    const errors: string[] = [];
    const {type, query, data, expectedResults, dataContent} = this.fg.value;
    const filledDataRows = (dataContent.rows || []).filter(r => !!r.subject && !!r.predicate && !!r.object);
    const countExpectedResults = filledDataRows.filter(r => r.expectedResult).length;
    const countDataRows = filledDataRows.length;


    switch (type) {
      case 'INFERENCE_VERIFICATION':
        if (!query.file?.length && !query.content && !query.fileName) {
          errors.push(TestCrudComponent._getQueryLabel(type));
        }

        if (!data.file?.length && !data.fileName && countDataRows <= 0) {
          errors.push('Sample dataset');
        }

        return errors;

      case 'ERROR_PROVOCATION':
        if (!data.file?.length && !data.fileName && countDataRows <= 0) {
          return ['Sample dataset with errors'];
        }

        return [];

      case 'COMPETENCY_QUESTION':
        if (!query.file?.length && !query.content && !query.fileName) {
          errors.push(TestCrudComponent._getQueryLabel(type));
        }

        if (!data.file?.length && !data.fileName && countDataRows <= 0) {
          errors.push('Sample dataset');
        }

        if (!expectedResults.file?.length && !expectedResults.fileName && countExpectedResults <= 0) {
          errors.push('Expected results');
        }

        return errors;

      default:
        return false;
    }
  }

  private _buildSummary(data?: TestDetail): void {
    if (!data) {
      return;
    }

    const savedTestSummary: Summary[] = [{
      label: 'ID',
      data: data.id
    }, {
      label: 'Test Case Type',
      data: TEST_TYPE_DEFINITIONS[data.type].label
    }, {
      label: 'Test Case Requirement',
      data: data.content
    }];

    if (data.query) {
      savedTestSummary.push({
        label: TestCrudComponent._getQueryLabel(data.type),
        data: data.query
      });
    } else if (data.queryFileName) {
      savedTestSummary.push({
        label: TestCrudComponent._getQueryLabel(data.type) + ' file name',
        data: data.queryFileName
      });
    }

    if (data.data) {
      savedTestSummary.push({
        label: 'Sample dataset' + (data.type === 'ERROR_PROVOCATION' ? ' with errors' : ''),
        data: data.data
      });
    } else if (data.dataFileName) {
      savedTestSummary.push({
        label: 'Sample dataset' + (data.type === 'ERROR_PROVOCATION' ? ' with errors' : '') + ' file name',
        data: data.dataFileName
      });
    }

    if (data.expectedResults) {
      savedTestSummary.push({
        label: 'Expected results',
        data: data.expectedResults
      });
    } else if (data.expectedResultsFileName) {
      savedTestSummary.push({
        label: 'Expected results file name',
        data: data.expectedResultsFileName
      });
    }

    this.savedTestSummary = savedTestSummary;
  }
}
