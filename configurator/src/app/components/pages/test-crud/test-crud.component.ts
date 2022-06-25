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
import { markAllAsDirty, toggleDisableControls } from '../../../utils';
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
    // form group initialization. Put here to not have issues in template and during page loading
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

    // page initialization
    this._init();

    // form sub-components initialization
    // NOTE: sub-components refers to `config-data-input` and `config-file-input`
    this._initFormGroupSpecs();
  }

  ngOnDestroy(): void {
    this._fragmentsSub?.unsubscribe();
  }

  /**
   * Resets form when test type changes
   */
  onTypeSelect(): void {
    // re-initialize sub-components
    this._initFormGroupSpecs();

    const topControls = this.fg.controls;
    topControls.query.reset();
    topControls.data.reset();
    topControls.expectedResults.reset();
    topControls.dataContent.reset();
    topControls.dataContent.controls.rows.clear();
  }

  /**
   * Reset data or expected results fields maintaining checkbox status
   * @param which Which field to reset
   * @param checked Whether to input file or raw data
   */
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
      // updates sub-component data
      this._updateFileInputFormGroups(this.test);
    }
  }

  /**
   * Opens select file modal and updates sub-component data
   * @param fg Sub-component specs
   */
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
        // if a file has been selected, update sub-component form group
        fg.formGroup.patchValue({
          content: '',
          file: undefined,
          fileName: `${file.name}.${file.extension}`
        });
      }

      $sub.unsubscribe();
    });
  }

  /**
   * Saves a new test uploading possible files
   */
  save(): void {
    // reset feedback messages
    this._resetMessages();
    const fragment = this.fragment;

    // check if fragment has been initialized
    // should never be true
    if (!fragment) {
      this._showError('Application error: Unable to retrieve fragment');
      return;
    }

    // if form group is not valid, mark all as touched and dirty to trigger
    // feedback message display, and show a feedback message
    if (!this.fg.valid) {
      this.fg.markAllAsTouched();
      markAllAsDirty(this.fg);
      this._showError('Missing required fields');
      return;
    }

    const formValue = this.fg.value;

    // Check for form value. Should never be true
    if (!formValue) {
      this._showError('Application error: Unable to retrieve form value');
      return;
    }

    // Check for required fields
    if (!this._checkRequired()) {
      return;
    }

    // Disable controls to prevent user interaction while saving
    toggleDisableControls(this.fg);

    // check and upload files and, possibly, update form group
    const $queryFileUpload = this._uploadFiles(this.fg.controls.query, 'query', true);
    const $dataFileUpload = this._uploadFiles(this.fg.controls.data, 'dataset');
    const $expectedResultsFileUpload = this._uploadFiles(this.fg.controls.expectedResults, 'expectedResults');

    // create new test specification to save to UserInput.json
    let updateValue: Omit<TestDetail, 'id'> = {
      type: formValue.type || 'INFERENCE_VERIFICATION',
      content: formValue.content || '',
      reasoner: formValue.reasoner,
      status: 'running'
    };

    // actually perform save
    // upload files in parallel
    lastValueFrom(concat($queryFileUpload, $dataFileUpload, $expectedResultsFileUpload)
      .pipe(toArray())
      .pipe(switchMap((results: ApiResult<{ fileName?: string; content?: string }>[]) => {
          const success = results.reduce((prev, current) => prev && current.success, true);
          if (!success) {
            return throwError(() => results.map(r => r.message).filter(m => !!m).join(', '));
          }

          // update test final specification
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

          // create data and expected results turtle files from data table rows
          for (const r of formValue.dataContent.rows) {
            const data = `${r.subject} ${r.predicate} ${r.object}\n`;
            updateValue.data += data;

            if (r.expectedResult) {
              updateValue.expectedResults += data;
            }
          }

          updateValue.data = updateValue.data?.trim();
          updateValue.expectedResults = updateValue.expectedResults?.trim();

          // upload fragment test
          return this._apiService.updateFragmentTest(fragment, updateValue, this.test?.id);
        })
      )).finally(() => toggleDisableControls(this.fg))
      .then(result => {
        this.saved = result.success;
        this._showError(result.message);
        this._buildSummary(result.data);
      })
      .catch(err => {
        this._showError(err);
      });

  }


  /**
   * Initializes test crud page
   */
  private _init(): void {
    // get route parameters and fragment
    this._route.params
      .pipe(switchMap((p: EditFragmentTestParams): Observable<[Fragment, EditFragmentTestParams]> => {
        const chunks = p.fragmentName?.split('_');

        if (!p.fragmentName || chunks?.length < 2) {
          return throwError(() => 'Empty or incorrect parameter name provided. Expected ontologyName_fragmentName');
        }

        const [ontologyName, fragmentName] = chunks;
        return zip(this._apiService.getFragment(fragmentName, ontologyName), of(p));
      }))

      // get test specifications
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

      // initialize form group
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

  /**
   * Updates form group with previous test information. Only invoked
   * in case a test is being updated
   * @param test Test specifications
   */
  private _updateFormGroup(test: TestDetail): void {
    this.fg.patchValue({
      content: test.content,
      reasoner: test.reasoner,
      type: test.type,
    });

    this._updateFileInputFormGroups(test);
  }

  /**
   * Updates sub-components form group and specifications
   * @param test Test specifications
   */
  private _updateFileInputFormGroups(test: TestDetail): void {
    // initializes data and expected results table
    // prefixes and data are divided by two \n\n
    const chunks = (test.data || '\n\n').split(/(?:\r?\n){2}/);
    let data, prefixes = '';

    if (chunks.length === 1) {
      data = chunks[0];
    } else {
      prefixes = chunks[0];
      data = chunks[1];
    }

    // data rows are divided by \n
    const rows: RecursivePartial<DataSpec>[] = data.split(/\r?\n/).filter(r => !!r.trim()).map((r) => {
      // expected results rows matches the one of data. If a row is found in expectedResult, mark it
      const expectedResult = test.expectedResults?.includes(r) || false;

      // data chunks are divided by a spaces
      const [subject, predicate, object, graph] = r.split(' ');
      return {expectedResult, subject, predicate, object, graph};
    });

    // push rows into corresponding form array
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

    // initialize sub-components specifications
    this._initFormGroupSpecs();
  }

  /**
   * Helper to get test correct query form label
   * @param type Test type
   * @returns Test type label
   */
  private static _getQueryLabel(type: TestType): string {
    switch (type) {
      case 'COMPETENCY_QUESTION':
        return 'SELECT SPARQL Query';

      case 'INFERENCE_VERIFICATION':
        return 'ASK SPARQL Query';
    }

    return 'Query';
  }

  /**
   * Initialize sub-components specifications
   */
  private _initFormGroupSpecs(): void {
    this.queryFg = this._initQueryFg();
    this.dataFg = this._initDataFg();
    this.expectedResultFg = this._initExpectedResultsFg();
  }

  /**
   * Initializes query sub-component
   */
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

  /**
   * Initializes data sub-component
   */
  private _initDataFg(): FileInputFormGroupSpec {
    const type: TestType = this.fg.controls.type.value;

    return {
      label: 'Sample dataset' + (type === 'ERROR_PROVOCATION' ? ' with errors' : ''),
      formGroup: this.fg.controls.data,
      fileType: 'dataset'
    };
  }

  /**
   * Initializes expected results sub-component
   */
  private _initExpectedResultsFg(): FileInputFormGroupSpec | undefined {
    const type: TestType = this.fg.controls.type.value;

    // if competency question data type, simply return undefined value
    if (type !== 'COMPETENCY_QUESTION') {
      return undefined;
    }

    return {
      label: 'Expected results',
      formGroup: this.fg.controls.expectedResults,
      fileType: 'expectedResults'
    };
  }


  /**
   * Checks for required fields. Since checks are complex and hiding and showing
   * form fields can fool angular, all fields are set non-required and checks are
   * done manually with this function
   */
  private _checkRequired(): boolean {
    // reset error messages
    this._resetMessages();

    // check for form group value
    // should never be true
    if (!this.fg.value) {
      this._showError('Application error: Unable to retrieve form value');
      return false;
    }

    const errors: string[] = [];
    const {type, query, data, expectedResults, dataContent} = this.fg.value;
    const filledDataRows = (dataContent.rows || []).filter(r => !!r.subject && !!r.predicate && !!r.object);
    const countExpectedResults = filledDataRows.filter(r => r.expectedResult).length;
    const countDataRows = filledDataRows.length;

    // depending on test type, check for fields and, possibly show errors
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

    // if there are some errors, show them
    this._showError(`Missing Required field${errors.length === 1 ? '' : 's'} "${errors.join('", "')}"`);
    return false;
  }

  /**
   * Uploads file in provided form group
   * @param fg Sub-component form group
   * @param type File type to upload
   * @param hasContent Whether to pass back form group `content` or not
   * @returns Observable of ApiResult
   */
  private _uploadFiles(fg: TypedFormGroup<FileInputFormGroup>, type: FileTypes, hasContent = false): Observable<ApiResult<{ fileName?: string; content?: string }>> {
    const fgVal = fg.value;
    const fragment = this.fragment;

    // check for fragment and form group value.
    // should never be true
    if (!fgVal || !fragment) {
      return throwError(() => 'Application error: Could not get form value or fragment empty');
    }

    let $obs: Observable<ApiResult<string>> | undefined;

    if (fgVal.file?.length) {
      $obs = this._apiService.uploadTestFile(fgVal.file[0], type, fragment);
    } else if (fgVal.fileName) {
      // if no file is provided, return a fake observable
      $obs = of({success: true, data: fgVal.fileName});
    }

    if ($obs) {
      return $obs.pipe(map((res): ApiResult<{ fileName?: string; content?: string }> => {
        let fileName: string;

        // res.data contains final file name (i.e.: the one with which the file has been uploaded to GitHub)
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

  /**
   * Helper to show error alert
   * @param error Error to show
   */
  private _showError(error?: string): void {
    this.saveErrorMsg = error;
    this.showAlert = true;
    this.alert.nativeElement?.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  /**
   * Helper to reset error alert
   */
  private _resetMessages(): void {
    this.initErrorMsg = '';
    this.saveErrorMsg = '';
    this.showAlert = false;
  }

  /**
   * Builds saved data summary
   * @param data Test data
   */
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
