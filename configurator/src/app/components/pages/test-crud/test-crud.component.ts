import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../services';
import {
  catchError,
  concat,
  EMPTY,
  lastValueFrom,
  map,
  Observable,
  of,
  Subscription,
  switchMap,
  throwError,
  toArray,
  zip
} from 'rxjs';
import {
  ApiResult,
  DataSpec,
  EditFragmentTestParams,
  FileInputFormGroup,
  FileInputFormGroupSpec,
  FileTypes,
  Fragment,
  FragmentFile,
  RecursivePartial,
  TestDetail,
  TestDetailForm,
  TestType
} from '../../../models';
import { TypedFormArray, TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { FILE_TYPES, REASONERS, TEST_TYPE_DEFINITIONS } from '../../../constants';
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
  readonly testTypes = TEST_TYPE_DEFINITIONS;
  readonly reasoners = REASONERS;

  useDataFile = false;
  useExpectedResultsFile = false;


  @ViewChild('alert', {read: ElementRef}) alert!: ElementRef<HTMLElement>;


  private _fragmentsSub?: Subscription;


  constructor(private _route: ActivatedRoute, private _apiService: ApiService, private _dialogService: DialogService) {
    this.fg = new TypedFormGroup<TestDetailForm>({
      type: new TypedFormControl<TestType>('COMPETENCY_QUESTION'),
      content: new TypedFormControl<string>(),
      reasoner: new TypedFormControl<string>(this.reasoners[0]),
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
    topControls.dataContent.controls.rows.clear();
  }

  resetDataAndExpectedResults(which: 'data' | 'expectedResults', checked: boolean): void {
    const dataContentControls = this.fg.controls.dataContent.controls;

    this.fg.controls.expectedResults.reset();
    this.fg.controls.data.reset();
    dataContentControls.prefixes.reset();
    dataContentControls.rows.clear();

    if (which === 'data') {
      this.useDataFile = checked;
    } else {
      this.useExpectedResultsFile = checked;
    }

    if (this.test) {
      this._updateFileInputFormGroups(this.test);
    }
  }

  selectFile(fg: FileInputFormGroupSpec): void {
    const ref = this._dialogService.open(SelectFileComponent, {
      data: {
        fragment: this.fragment,
        fileType: fg.fileType
      },
      header: `Select existing ${fg.label.toLowerCase()}`,
      modal: true
    });

    const $sub = ref.onClose.subscribe((file: FragmentFile) => {
      if (file) {
        fg.formGroup.patchValue({
          content: '',
          file: undefined,
          fileName: `${file.name}.${file.extension}`
        });
      }

      $sub.unsubscribe();
    });
  }

  save(): void {
    this._resetMessages();
    const fragment = this.fragment;

    if (!fragment) {
      this._showError('Application error: Unable to retrieve fragment');
      return;
    }

    console.log(this.fg.valid, this.fg.errors);

    if (!this.fg.valid) {
      markAllAsTouchedOrDirty(this.fg);
      markAllAsTouchedOrDirty(this.fg, true);
      this._showError('Missing required fields');
      return;
    }

    const formValue = this.fg.value;
    if (!formValue) {
      this._showError('Application error: Unable to retrieve form value');
      return;
    }

    if (!this._checkRequired()) {
      return;
    }

    this._toggleDisable();

    const $queryFileUpload = this._uploadFiles(this.fg.controls.query, 'query', true);
    const $dataFileUpload = this._uploadFiles(this.fg.controls.data, 'dataset');
    const $expectedResultsFileUpload = this._uploadFiles(this.fg.controls.expectedResults, 'expectedResults');


    let updateValue: Omit<TestDetail, 'id'> = {
      type: formValue.type || 'INFERENCE_VERIFICATION',
      content: formValue.content || '',
      reasoner: formValue.reasoner,
      status: 'running'
    };

    lastValueFrom(concat($queryFileUpload, $dataFileUpload, $expectedResultsFileUpload)
      .pipe(toArray())
      .pipe(switchMap((results: ApiResult<{ fileName?: string; content?: string }>[]) => {
          const success = results.reduce((prev, current) => prev && current.success, true);
          if (!success) {
            return throwError(() => results.map(r => r.message).filter(m => !!m).join(', '));
          }

          const [queryRes, dataRes, erRes] = results;
          updateValue = {
            ...updateValue,
            query: queryRes.data?.content,
            queryFileName: queryRes.data?.fileName,

            data: (formValue.dataContent.prefixes || '') + '\n\n',
            dataFileName: dataRes.data?.fileName,

            expectedResults: (formValue.dataContent.prefixes || '') + '\n\n',
            expectedResultsFileName: erRes.data?.fileName,
          };

          for (const r of formValue.dataContent.rows) {
            const data = `${r.subject} ${r.predicate} ${r.object}\n`;
            updateValue.data += data;

            if (r.expectedResult) {
              updateValue.expectedResults += data;
            }
          }

          updateValue.data = updateValue.data?.trim();
          updateValue.expectedResults = updateValue.expectedResults?.trim();

          return this._apiService.updateFragmentTest(fragment, updateValue, this.test?.id);
        })
      )).finally(() => this._toggleDisable())
      .then(result => {
        this.saved = result.success;
        this._showError(result.message);
        this._buildSummary(result.data);
      })
      .catch(err => {
        this._showError(err);
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
    this._route.params
      .pipe(switchMap((p: EditFragmentTestParams): Observable<[Fragment, EditFragmentTestParams]> => {
        const chunks = p.fragmentName?.split('_');

        if (!p.fragmentName || chunks?.length < 2) {
          return throwError(() => 'Empty or incorrect parameter name provided. Expected ontologyName_fragmentName');
        }

        const [ontologyName, fragmentName] = chunks;
        return zip(this._apiService.getFragment(fragmentName, ontologyName), of(p));
      }))


      .pipe(switchMap(([fragment, p]): Observable<[Fragment, TestDetail | undefined]> => {
        if (p.testId) {
          return zip(of(fragment), this._apiService.getFragmentTest(fragment, p.testId));
        }
        return of([fragment, undefined]);
      }))


      .pipe(catchError(err => {
        this.initErrorMsg = err;
        return EMPTY;
      }))


      .subscribe(([fragment, testDetail]) => {
        if (testDetail?.status === 'running') {
          this.initErrorMsg = 'You can\'t edit a running test. Wait until it has finished running';
          return;
        }

        this.fragment = fragment;
        this.test = testDetail;
        if (testDetail) {
          this._updateFormGroup(testDetail);
        }
      });
  }

  private _updateFormGroup(test: TestDetail): void {
    this.fg.patchValue({
      content: test.content,
      reasoner: test.reasoner,
      type: test.type,
    });

    this._updateFileInputFormGroups(test);
  }

  private _updateFileInputFormGroups(test: TestDetail): void {
    const chunks = (test.data || '\n\n').split(/(?:\r?\n){2}/);
    let data, prefixes = '';

    if (chunks.length === 1) {
      data = chunks[0];
    } else {
      prefixes = chunks[0];
      data = chunks[1];
    }

    const rows: RecursivePartial<DataSpec>[] = data.split(/\r?\n/).filter(r => !!r.trim()).map((r) => {
      const expectedResult = test.expectedResults?.includes(r) || false;
      const [subject, predicate, object, graph] = r.split(' ');
      return {expectedResult, subject, predicate, object, graph};
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
      placeholder,
      fileType: 'query'
    };
  }

  private _initDataFg(): FileInputFormGroupSpec {
    const type: TestType = this.fg.controls.type.value;

    return {
      label: 'Sample dataset' + (type === 'ERROR_PROVOCATION' ? ' with errors' : ''),
      formGroup: this.fg.controls.data,
      fileType: 'dataset'
    };
  }

  private _initExpectedResultsFg(): FileInputFormGroupSpec | undefined {
    const type: TestType = this.fg.controls.type.value;

    if (type !== 'COMPETENCY_QUESTION') {
      return undefined;
    }

    return {
      label: 'Expected results',
      formGroup: this.fg.controls.expectedResults,
      fileType: 'expectedResults'
    };
  }

  private _checkRequired(): boolean {
    this._resetMessages();

    if (!this.fg.value) {
      this._showError('Application error: Unable to retrieve form value');
      return false;
    }

    const errors: string[] = [];
    const {type, query, data, expectedResults, dataContent} = this.fg.value;
    const filledDataRows = (dataContent.rows || []).filter(r => !!r.subject && !!r.predicate && !!r.object);
    const countExpectedResults = filledDataRows.filter(r => r.expectedResult).length;
    const countDataRows = filledDataRows.length;

    console.log({type});

    switch (type) {
      case 'INFERENCE_VERIFICATION':
        if (!query.file?.length && !query.content && !query.fileName) {
          errors.push(TestCrudComponent._getQueryLabel(type));
        }

        if (!data.file?.length && !data.fileName && countDataRows <= 0) {
          errors.push('Sample dataset');
        }

        break;

      case 'ERROR_PROVOCATION':
        if (!data.file?.length && !data.fileName && countDataRows <= 0) {
          errors.push('Sample dataset with errors');
        }

        break;

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

        break;

      default:
        this._showError('Application error: error during save');
        return false;
    }

    if (errors.length === 0) {
      return true;
    }

    this._showError(`Missing Required field${errors.length === 1 ? '' : 's'} "${errors.join('", "')}"`);
    return false;
  }

  private _uploadFiles(fg: TypedFormGroup<FileInputFormGroup>, type: FileTypes, hasContent = false): Observable<ApiResult<{ fileName?: string; content?: string }>> {
    const fgVal = fg.value;
    const fragment = this.fragment;

    if (!fgVal || !fragment) {
      return throwError(() => 'Application error: Could not get form value or fragment empty');
    }

    let $obs: Observable<ApiResult<string>> | undefined;

    if (fgVal.file?.length) {
      $obs = this._apiService.uploadTestFile(fgVal.file[0], type, fragment);
    } else if (fgVal.fileName) {
      $obs = of({success: true, data: fgVal.fileName});
    }

    if ($obs) {
      return $obs.pipe(map((res): ApiResult<{ fileName?: string; content?: string }> => {
        let fileName: string;

        if (!res.data?.startsWith(`${fragment.ontologyName}/${fragment.name}/${FILE_TYPES[type].folder}/`)) {
          fileName = `${fragment.ontologyName}/${fragment.name}/${FILE_TYPES[type].folder}/${res.data}`;
        } else {
          fileName = res.data;
        }

        return {
          ...res,
          data: {fileName}
        };
      }));
    }

    if (hasContent && fgVal.content) {
      return of({success: true, data: {content: fgVal.content}});
    }


    return of({success: true, data: {}});
  }

  private _showError(error?: string): void {
    this.saveErrorMsg = error;
    this.showAlert = true;
    this.alert.nativeElement?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  private _resetMessages(): void {
    this.initErrorMsg = '';
    this.saveErrorMsg = '';
    this.showAlert = false;
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
