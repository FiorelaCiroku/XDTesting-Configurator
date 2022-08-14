import { Component, EventEmitter, Input, NO_ERRORS_SCHEMA, Output } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { lastValueFrom, Observable, of, Subject } from 'rxjs';
import { ApiResult, DataSpec, EditFragmentTestParams, FileInputFormGroup, FileInputFormGroupSpec, Fragment, FragmentFile, RecursivePartial, TestDetail, TestDetailForm } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { TypedFormControl, TypedFormGroup } from 'src/app/utils/typed-form';
import { SelectFileComponent } from '../../modals';
import { Summary } from '../../shared';
import { TestCrudComponent } from './test-crud.component';

@Component({ selector: 'config-data-input' })
class DataInputComponentMock {
  @Input() withExpectedResults = true;
  @Input() onlyExpectedResults = false;
}

@Component({ selector: 'config-file-input' })
class FileInputComponentMock {
  @Input() showDefaultInput = true;
  @Input() formGroupSpec?: FileInputFormGroupSpec;
  @Input() currentFile?: string;

  @Output() onShowExistingFiles = new EventEmitter<FileInputFormGroupSpec>();
  @Output() onToggleUploadOrSelectUploaded = new EventEmitter<boolean>();
}


async function initialize(apiServiceMock?: Partial<ApiService>, activatedRouteMock?: Partial<ActivatedRoute>, dialogServiceMock?: Partial<DialogService>): Promise<{ component: TestCrudComponent; fixture: ComponentFixture<TestCrudComponent> }> {
  activatedRouteMock ??= {
    params: of({})
  };

  apiServiceMock ??= {};
  dialogServiceMock ??= {};

  await TestBed.configureTestingModule({
    declarations: [
      TestCrudComponent,
      DataInputComponentMock,
      FileInputComponentMock
    ],
    providers: [
      { provide: ApiService, useValue: apiServiceMock },
      { provide: ActivatedRoute, useValue: activatedRouteMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
    .overrideComponent(TestCrudComponent, {
      set: {
        providers: [
          { provide: DialogService, useValue: dialogServiceMock }
        ]
      }
    })
    .compileComponents();

  const fixture = TestBed.createComponent(TestCrudComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component };
}

function fillFormGroup(fg: TypedFormGroup<TestDetailForm>): void {
  fg.patchValue({
    query: {
      content: 'queryContent'
    },
    data: {
      fileName: 'dataFileName'
    },
    expectedResults: {
      fileName: 'expectedResultsFileName'
    },
    dataContent: {
      prefixes: 'prefixes'
    }
  });

  fg.controls.dataContent.controls.rows.push(new TypedFormGroup<DataSpec>({
    subject: new TypedFormControl<string>('sub'),
    predicate: new TypedFormControl<string>('pred'),
    object: new TypedFormControl<string>('obj'),
    expectedResult: new TypedFormControl<boolean>(true),
  }));
}

describe('TestCrudComponent', () => {
  it('should show error on invalid parameters', async () => {
    const params$ = new Subject<EditFragmentTestParams>();
    const { component } = await initialize(undefined, {
      params: params$.asObservable()
    });

    expect(component).toBeTruthy();

    const test = (fragmentName?: string | undefined): void => {
      component.initErrorMsg = '';
      params$.next({ fragmentName });
      component['_init']();
      tick();
      expect(component.initErrorMsg).toEqual('Empty or incorrect parameter name provided. Expected ontologyName_fragmentName');
    };

    const args: Parameters<typeof test>[] = [
      [undefined],
      [''],
      ['invalid'],
      ['fragment-ontology'],
      ['fragment:ontology'],
    ];

    for (const [arg] of args) {
      fakeAsync(test)(arg);
    }
  });

  it('should not try to get test detail on undefined test id', async () => {
    const apiServiceMock: Partial<ApiService> = {
      getFragment(): Observable<Fragment> { return of({ name: 'fragment', ontologyName: 'ontology' }); },
      getFragmentTest: jasmine.createSpy('getFragmentTest')
    };

    const { component } = await initialize(apiServiceMock, { params: of({ fragmentName: 'ontology_fragment' }) });
    const updateFormGroupSpy = spyOn<any>(component, '_updateFormGroup').and.callThrough();

    expect(component.initErrorMsg).toBeUndefined();
    expect(apiServiceMock.getFragmentTest).not.toHaveBeenCalled();
    expect(updateFormGroupSpy).not.toHaveBeenCalled();
  });

  it('should show error on running test', async () => {
    const fragment: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const test: TestDetail = { id: '123', status: 'running', type: 'COMPETENCY_QUESTION', content: '' };
    const params: EditFragmentTestParams = { fragmentName: `${fragment.ontologyName}_${fragment.name}`, testId: test.id };
    const apiServiceMock: Partial<ApiService> = {
      getFragment: jasmine.createSpy('getFragment').and.returnValue(of(fragment)),
      getFragmentTest: jasmine.createSpy('getFragmentTest').and.returnValue(of(test))
    };

    const { component } = await initialize(apiServiceMock, { params: of(params) });

    expect(apiServiceMock.getFragment).toHaveBeenCalledWith(fragment.name, fragment.ontologyName);
    expect(apiServiceMock.getFragmentTest).toHaveBeenCalledWith(fragment, test.id);
    expect(component.initErrorMsg).toEqual('You can\'t edit a running test. Wait until it has finished running');
  });

  it('should update form group on initialization', async () => {
    // #region initialization
    const fragment: Fragment = { name: 'fragment', ontologyName: 'ontology' };
    const baseTest: TestDetail = { id: '123', status: 'success', type: 'COMPETENCY_QUESTION', content: '' };
    const test$ = new Subject<TestDetail>();
    const testId = '123';
    const params: EditFragmentTestParams = { fragmentName: `${fragment.ontologyName}_${fragment.name}`, testId };
    const apiServiceMock: Partial<ApiService> = {
      getFragment: jasmine.createSpy('getFragment').and.returnValue(of(fragment)),
      getFragmentTest: jasmine.createSpy('getFragmentTest').and.returnValue(test$.asObservable())
    };

    const { component } = await initialize(apiServiceMock, { params: of(params) });
    // #endregion


    // #region test template
    function test(testDetail: Partial<TestDetail>, expectations?: () => void): void {
      const fullTestDetail: TestDetail = { ...baseTest, ...testDetail };

      component.fg.reset();
      component.fg.controls.dataContent.controls.rows.clear();
      test$.next(fullTestDetail);
      component['_init']();
      tick();

      expect(apiServiceMock.getFragment).toHaveBeenCalledWith(fragment.name, fragment.ontologyName);
      expect(apiServiceMock.getFragmentTest).toHaveBeenCalledWith(fragment, fullTestDetail.id!);
      expect(component.initErrorMsg).toBeUndefined();
      expect(component.fragment).toBe(fragment);
      expect(component.test).toBe(fullTestDetail);

      const fgControls = component.fg.controls;

      expect(fgControls.content.value).toEqual(fullTestDetail.content);
      expect(fgControls.reasoner!.value).toEqual(fullTestDetail.reasoner);
      expect(fgControls.type.value).toEqual(fullTestDetail.type);
      expect(fgControls.query.controls.content!.value).toEqual(fullTestDetail.content || undefined);
      expect(fgControls.query.controls.fileName!.value).toEqual(fullTestDetail.queryFileName);
      expect(fgControls.data.controls.fileName!.value).toEqual(fullTestDetail.dataFileName);
      expect(fgControls.expectedResults.controls.fileName!.value).toEqual(fullTestDetail.expectedResultsFileName);

      expectations?.();
    }
    // #endregion


    // #region test arguments
    const args: Parameters<typeof test>[] = [
      [
        { data: ' ' },
        (): void => {
          expect(component.fg.controls.dataContent.controls.prefixes.value).toEqual('');
          expect(component.fg.controls.dataContent.controls.rows.length).toEqual(0);
          expect(component.queryFg.label).toEqual('SELECT SPARQL Query');
          expect(component.dataFg.label).toEqual('Sample dataset');
          expect(component.expectedResultFg).toBeDefined();
        }
      ],
      [
        { data: '' },
        (): void => {
          expect(component.fg.controls.dataContent.controls.prefixes.value).toEqual('');
          expect(component.fg.controls.dataContent.controls.rows.length).toEqual(0);
          expect(component.queryFg.label).toEqual('SELECT SPARQL Query');
          expect(component.dataFg.label).toEqual('Sample dataset');
          expect(component.expectedResultFg).toBeDefined();
        }
      ],
      [
        { data: 'prefix\n\na b c d\ne f g' },
        (): void => {
          expect(component.fg.controls.dataContent.controls.prefixes.value).toEqual('prefix');
          expect(component.fg.controls.dataContent.controls.rows.length).toEqual(2);
          expect(component.fg.controls.dataContent.controls.rows.controls[0].value).toEqual({ expectedResult: false, subject: 'a', predicate: 'b', object: 'c', graph: 'd' });
          expect(component.fg.controls.dataContent.controls.rows.controls[1].value).toEqual({ expectedResult: false, subject: 'e', predicate: 'f', object: 'g', graph: undefined });
          expect(component.queryFg.label).toEqual('SELECT SPARQL Query');
          expect(component.dataFg.label).toEqual('Sample dataset');
          expect(component.expectedResultFg).toBeDefined();
        }
      ],
      [
        { data: 'prefix\n\na b c', expectedResults: 'a b c' },
        (): void => {
          expect(component.fg.controls.dataContent.controls.prefixes.value).toEqual('prefix');
          expect(component.fg.controls.dataContent.controls.rows.length).toEqual(1);
          expect(component.fg.controls.dataContent.controls.rows.controls[0].value).toEqual({ expectedResult: true, subject: 'a', predicate: 'b', object: 'c', graph: undefined });
          expect(component.queryFg.label).toEqual('SELECT SPARQL Query');
          expect(component.dataFg.label).toEqual('Sample dataset');
          expect(component.expectedResultFg).toBeDefined();
        }
      ],
      [
        { type: 'ERROR_PROVOCATION' },
        (): void => {
          expect(component.queryFg.label).toEqual('Query');
          expect(component.dataFg.label).toEqual('Sample dataset with errors');
          expect(component.expectedResultFg).toBeUndefined();
        }
      ],
      [
        { type: 'INFERENCE_VERIFICATION' },
        (): void => {
          expect(component.queryFg.label).toEqual('ASK SPARQL Query');
        }
      ]
    ];
    // #endregion

    for (const [testDetail, expectations] of args) {
      fakeAsync(test)(testDetail, expectations);
    }
  });

  it('should reset form group on type change', async () => {
    const { component } = await initialize();

    component.fg.patchValue({
      query: {
        content: 'queryContent'
      },
      data: {
        fileName: 'dataFileName'
      },
      expectedResults: {
        fileName: 'expectedResultsFileName'
      },
      dataContent: {
        prefixes: 'prefixes'
      }
    });

    component.fg.controls.dataContent.controls.rows.push(new TypedFormGroup<DataSpec>({
      subject: new TypedFormControl<string>('sub'),
      predicate: new TypedFormControl<string>('pred'),
      object: new TypedFormControl<string>('obj'),
      expectedResult: new TypedFormControl<boolean>(true),
    }));

    component.onTypeSelect();

    const controls = component.fg.controls;
    expect(controls.query.value).toEqual(jasmine.objectContaining({ content: null, file: null, fileName: null }));
    expect(controls.data.value).toEqual(jasmine.objectContaining({ file: null, fileName: null }));
    expect(controls.expectedResults.value).toEqual(jasmine.objectContaining({ file: null, fileName: null }));
    expect(controls.dataContent.controls.prefixes.value).toEqual(null);
    expect(controls.dataContent.controls.rows.length).toEqual(0);
  });

  it('should reset data and expected results', async () => {
    const { component } = await initialize();
    const updateFileInputFormGroupsSpy = spyOn<any>(component, '_updateFileInputFormGroups').and.callFake(() => { /* */ });

    const test = (which: 'data' | 'expectedResults'): void => {
      fillFormGroup(component.fg);
      component.useDataFile = false;
      component.useExpectedResultsFile = false;
      component.test = {} as TestDetail;
      component.resetDataAndExpectedResults(which, true);

      const controls = component.fg.controls;
      expect(controls.query.value).toEqual(jasmine.objectContaining({ content: 'queryContent' }));
      expect(controls.data.value).toEqual(jasmine.objectContaining({ file: null, fileName: null }));
      expect(controls.expectedResults.value).toEqual(jasmine.objectContaining({ file: null, fileName: null }));
      expect(controls.dataContent.controls.prefixes.value).toEqual(null);
      expect(controls.dataContent.controls.rows.length).toEqual(0);
      expect(component.useDataFile).toBe(which === 'data');
      expect(component.useExpectedResultsFile).toBe(which === 'expectedResults');
      expect(updateFileInputFormGroupsSpy).toHaveBeenCalled();
    };

    test('data');
    test('expectedResults');
  });

  it('should open select file modal', async () => {
    const close$ = new Subject<FragmentFile | undefined>();
    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue({
        onClose: close$.asObservable()
      })
    };

    const { component } = await initialize(undefined, undefined, dialogServiceMock);
    const formGroup = new TypedFormGroup<FileInputFormGroup>({
      file: new TypedFormControl<FileList>(),
      fileName: new TypedFormControl<string>(),
      content: new TypedFormControl<string>()
    });
    const patchSpy = spyOn(formGroup, 'patchValue').and.callThrough();

    const test = (file?: FragmentFile): void => {
      component.selectFile({ fileType: 'query', label: 'query', formGroup });
      expect(dialogServiceMock.open).toHaveBeenCalledWith(SelectFileComponent, {
        data: {
          fragment: undefined,
          fileType: 'query'
        },
        header: 'Select existing query',
        modal: true
      });

      close$.next(file);
    };

    fakeAsync(test)(undefined);
    expect(patchSpy).not.toHaveBeenCalled();

    fakeAsync(test)({
      name: 'fileName',
      path: 'filePath',
      type: 'query',
      extension: 'txt'
    });
    expect(patchSpy).toHaveBeenCalledWith({
      content: '',
      file: undefined,
      fileName: 'fileName.txt'
    });

  });

  it('should error on undefined fragment', async () => {
    const { component } = await initialize();

    // eslint-disable-next-line
    // @ts-ignore
    component.alert.nativeElement = null;

    component.save();
    expect(component.saveErrorMsg).toEqual('Application error: Unable to retrieve fragment');
    expect(component.showAlert).toBeTrue();
  });

  it('should error on invalid form', async () => {
    const { component } = await initialize();

    component.fg = jasmine.createSpyObj<TypedFormGroup<TestDetailForm>>(
      'formGroup',
      ['markAllAsTouched', 'markAsDirty'],
      { valid: false }
    );
    component.fragment = {} as Fragment;
    component.alert.nativeElement = document.createElement('div');
    const scrollSpy = spyOn(component.alert.nativeElement, 'scrollIntoView');

    component.save();

    expect(component.saveErrorMsg).toEqual('Missing required fields');
    expect(component.showAlert).toBeTrue();
    expect(scrollSpy).toHaveBeenCalled();
    expect(component.fg.markAllAsTouched).toHaveBeenCalled();
    expect(component.fg.markAsDirty).toHaveBeenCalled();
  });

  it('should error on empty form group value', async () => {
    const { component } = await initialize();

    component.fragment = {} as Fragment;
    component.alert.nativeElement = document.createElement('div');
    component.fg = jasmine.createSpyObj<TypedFormGroup<TestDetailForm>>('formGroup', [], { valid: true, value: null });

    const scrollSpy = spyOn(component.alert.nativeElement, 'scrollIntoView');

    component.save();

    expect(component.saveErrorMsg).toEqual('Application error: Unable to retrieve form value');
    expect(component.showAlert).toBeTrue();
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('should stop on empty required fields', async () => {
    const { component } = await initialize();
    const uploadSpy = spyOn<any>(component, '_uploadFiles');
    const dataTransfer = new DataTransfer();

    component.fragment = {} as Fragment;
    dataTransfer.items.add(new File([], ''));
    spyOnProperty(component.fg, 'valid', 'get').and.returnValue(true);

    const test = (fgValue: RecursivePartial<TestDetailForm>, errorMsg: string): void => {
      component.fg.reset();
      component.fg.controls.dataContent.controls.rows.clear();

      if (fgValue.dataContent?.rows?.length) {
        for (let i = 0; i < fgValue.dataContent?.rows.length; i++) {
          component.fg.controls.dataContent.controls.rows.push(
            new TypedFormGroup<DataSpec>({
              subject: new TypedFormControl<string>(),
              predicate: new TypedFormControl<string>(),
              object: new TypedFormControl<string>(),
              expectedResult: new TypedFormControl<boolean>(),
              graph: new TypedFormControl<string>(),
            })
          );
        }
      }

      component.fg.patchValue(fgValue);
      component.save();
      expect(component.saveErrorMsg).toEqual(errorMsg);
      expect(uploadSpy).not.toHaveBeenCalled();
    };

    const args: Parameters<typeof test>[] = [
      [
        {},
        'Application error: error during save'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', dataContent: { rows: [{subject: 's', predicate: 'p'}, {predicate: 'p', object: 'o'}, {subject: 's', object: 'o'}]} },
        'Missing Required fields "ASK SPARQL Query", "Sample dataset"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', query: { file: dataTransfer.files } },
        'Missing Required field "Sample dataset"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', query: { fileName: 'fileName' } },
        'Missing Required field "Sample dataset"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', query: { content: 'content' } },
        'Missing Required field "Sample dataset"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', data: { file: dataTransfer.files } },
        'Missing Required field "ASK SPARQL Query"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', data: { fileName: 'fileName' } },
        'Missing Required field "ASK SPARQL Query"'
      ],
      [
        { type: 'INFERENCE_VERIFICATION', dataContent: { rows: [{ subject: 's', predicate: 'p', object: 'o' }]} },
        'Missing Required field "ASK SPARQL Query"'
      ],
      [
        { type: 'ERROR_PROVOCATION' },
        'Missing Required field "Sample dataset with errors"'
      ],
      [
        { type: 'ERROR_PROVOCATION', data: { file: [] } },
        'Missing Required field "Sample dataset with errors"'
      ],
      [
        { type: 'COMPETENCY_QUESTION' },
        'Missing Required fields "SELECT SPARQL Query", "Sample dataset", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', query: { file: dataTransfer.files } },
        'Missing Required fields "Sample dataset", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', query: { fileName: 'fileName' } },
        'Missing Required fields "Sample dataset", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', query: { content: 'content' } },
        'Missing Required fields "Sample dataset", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', data: { file: dataTransfer.files } },
        'Missing Required fields "SELECT SPARQL Query", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', data: { fileName: 'fileName' } },
        'Missing Required fields "SELECT SPARQL Query", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', dataContent: { rows: [{ subject: 's', predicate: 'p', object: 'o'}]} },
        'Missing Required fields "SELECT SPARQL Query", "Expected results"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', expectedResults: { file: dataTransfer.files } },
        'Missing Required fields "SELECT SPARQL Query", "Sample dataset"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', expectedResults: { fileName: 'fileName' } },
        'Missing Required fields "SELECT SPARQL Query", "Sample dataset"'
      ],
      [
        { type: 'COMPETENCY_QUESTION', dataContent: { rows: [{ subject: 's', predicate: 'p', object: 'o', expectedResult: true}]} },
        'Missing Required field "SELECT SPARQL Query"'
      ]

    ];

    for (const [val, error] of args) {
      test(val, error);
    }
  });

  it('should return true when all required fields are filled', async () => {
    const { component } = await initialize();

    function test(fgValue: RecursivePartial<TestDetailForm>): void {
      const result = component['_checkRequired'](fgValue as TestDetailForm);
      expect(result).toBeTrue();
    }

    const args: Parameters<typeof test>[] = [
      [
        {
          type: 'INFERENCE_VERIFICATION',
          query: { content: 'queryContent' },
          data: {},
          dataContent: { rows: [{ subject: 's', predicate: 'p', object: 'o'}]}
        }
      ],
      [
        {
          type: 'ERROR_PROVOCATION',
          data: { fileName: 'fileName' },
          dataContent: { rows: [] }
        }
      ],
      [
        {
          type: 'COMPETENCY_QUESTION',
          query: { content: 'queryContent' },
          data: {},
          dataContent: { rows: [{ subject: 's', predicate: 'p', object: 'o', expectedResult: true}]},
          expectedResults: {}
        }
      ]
    ];

    for (const [fgVal] of args) {
      test(fgVal);
    }
  });

  it('should throw error on invalid form value', async () => {
    const { component } = await initialize();
    const fg = { value: null} as TypedFormGroup<FileInputFormGroup>;

    await expectAsync(lastValueFrom(component['_uploadFiles']({} as Fragment, fg, 'query')))
      .toBeRejectedWith('Application error: Could not get form value');
  });

  it('should return empty data', async () => {
    const { component } = await initialize();
    const dataTransfer = new DataTransfer();
    const fg = new TypedFormGroup<FileInputFormGroup>({
      file: new TypedFormControl<FileList>(),
      fileName: new TypedFormControl<string>(),
      content: new TypedFormControl<string>()
    });

    let res = await lastValueFrom(component['_uploadFiles']({} as Fragment, fg, 'query'));
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({});

    fg.patchValue({file: dataTransfer.files});
    res = await lastValueFrom(component['_uploadFiles']({} as Fragment, fg, 'query', true));
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({});
  });

  it('should return content', async () => {
    const { component } = await initialize();
    const fg = new TypedFormGroup<FileInputFormGroup>({
      file: new TypedFormControl<FileList>(),
      fileName: new TypedFormControl<string>(),
      content: new TypedFormControl<string>('abc')
    });

    const res = await lastValueFrom(component['_uploadFiles']({} as Fragment, fg, 'query', true));
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({ content: 'abc' });
  });

  it('should return fileName', async () => {
    const uploadSpy = jasmine.createSpy('uploadTestFile').and.returnValue(of({success: true, data: 'ontology/fragment/queries/fileName'}));
    const { component } = await initialize({ uploadTestFile: uploadSpy });
    const dataTransfer = new DataTransfer();
    const fragment: Fragment = {
      ontologyName: 'ontology',
      name: 'fragment'
    };

    dataTransfer.items.add(new File([], 'fileName'));

    const fg = new TypedFormGroup<FileInputFormGroup>({
      file: new TypedFormControl<FileList>(dataTransfer.files),
      fileName: new TypedFormControl<string>()
    });

    let res = await lastValueFrom(component['_uploadFiles'](fragment, fg, 'query'));
    expect(uploadSpy).toHaveBeenCalledWith(dataTransfer.files[0], 'query', fragment);
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({ fileName: 'ontology/fragment/queries/fileName' });

    uploadSpy.calls.reset();
    uploadSpy.and.returnValue(of({ success: true }));
    res = await lastValueFrom(component['_uploadFiles'](fragment, fg, 'query'));
    expect(uploadSpy).toHaveBeenCalledWith(dataTransfer.files[0], 'query', fragment);
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({ fileName: 'ontology/fragment/queries/undefined' });

    fg.reset();
    uploadSpy.calls.reset();
    fg.patchValue({fileName: 'fileName'});
    res = await lastValueFrom(component['_uploadFiles'](fragment, fg, 'query'));
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(res.success).toBeTrue();
    expect(res.data).toEqual({ fileName: 'ontology/fragment/queries/fileName' });

  });

  it('should throw on upload file error', fakeAsync(async () => {
    const upload$ = new Subject<ApiResult>();
    const { component } = await initialize();
    component.fragment = {ontologyName: 'ontology', name: 'fragment'};
    spyOnProperty(component.fg, 'valid', 'get').and.returnValue(true);
    spyOn<any>(component, '_checkRequired').and.returnValue(true);
    spyOn<any>(component, '_uploadFiles').and.returnValue(upload$);

    component.save();

    expect(component.fg.disabled).toBeTrue();

    upload$.next({ success: false, message: 'General error' });
    upload$.next({ success: false, message: 'General error' });
    upload$.next({ success: false, message: 'General error' });
    upload$.complete();
    tick();

    expect(component.saveErrorMsg).toEqual('General error, General error, General error');
  }));

  it('should save', async () => {
    const updateSpy = jasmine.createSpy('updateFragmentTest').and.callFake(
      (_, updateObj) => of({ success: true, data: updateObj })
    );

    const { component } = await initialize({ updateFragmentTest: updateSpy });

    const uploadSpy = spyOn<any>(component, '_uploadFiles');
    spyOnProperty(component.fg, 'valid', 'get').and.returnValue(true);
    spyOn<any>(component, '_checkRequired').and.returnValue(true);
    spyOn<any>(component, '_buildSummary');

    component.fragment = {ontologyName: 'ontology', name: 'fragment'};

    function test(queryRes?: any, dataRes?: any, expectedRes?: any, fgPatchValue?: any): void {
      component.fg.reset();
      component.fg.controls.dataContent.controls.rows.clear();

      for (let i = 0; i < fgPatchValue?.dataContent?.rows?.length || 0; i++) {
        component.fg.controls.dataContent.controls.rows.push(new TypedFormGroup<DataSpec>({
          subject: new TypedFormControl<string>(),
          predicate: new TypedFormControl<string>(),
          object: new TypedFormControl<string>(),
          expectedResult: new TypedFormControl<boolean>()
        }));
      }

      component.fg.patchValue(fgPatchValue);

      const val = component.fg.value!;
      const upload$ = new Subject<ApiResult<any>>();
      const updateObj = {
        type: val.type || 'INFERENCE_VERIFICATION',
        query: queryRes?.content,
        queryFileName: queryRes?.fileName,
        dataFileName: dataRes?.fileName,
        expectedResultsFileName: expectedRes?.fileName,

        data: (fgPatchValue?.dataContent?.prefixes || '') + '\n\n' +
              (fgPatchValue?.dataContent?.rows || []).map(({subject, predicate, object}: any) => `${subject} ${predicate} ${object}`),

        expectedResults: (fgPatchValue?.dataContent?.prefixes || '') + '\n\n' +
                         (fgPatchValue?.dataContent?.rows || []).filter(({expectedResult}: any) => expectedResult)
                           .map(({subject, predicate, object}: any) => `${subject} ${predicate} ${object}`),
      };

      updateObj.data = updateObj.data.trim();
      updateObj.expectedResults = updateObj.expectedResults.trim();
      uploadSpy.and.returnValue(upload$.asObservable());

      component.save();
      expect(component.fg.disabled).toBeTrue();

      upload$.next({ success: true, data: queryRes });
      upload$.next({ success: true, data: dataRes });
      upload$.next({ success: true, data: expectedRes });
      upload$.complete();
      tick();

      expect(component.fg.disabled).toBeFalse();
      expect(component.saved).toBeTrue();
      expect(updateSpy).toHaveBeenCalledWith(component.fragment, jasmine.objectContaining(updateObj), component.test?.id);

      updateSpy.calls.reset();
    }

    const args: Parameters<typeof test>[] = [
      [ ],
      [ { content: 'content' } ],
      [ { fileName: 'fileName' } ],
      [ undefined, { fileName: 'fileName' }],
      [ undefined, undefined, undefined, { dataContent: { prefixes: 'prefixes', rows: [{ subject: 's', predicate: 'p', object: 'o'}]} }],
      [ undefined, undefined, { fileName: 'fileName'} ],
      [ undefined, undefined, undefined, { dataContent: { prefixes: 'prefixes', rows: [{ subject: 's', predicate: 'p', object: 'o', expectedResult: true}]} }],
      [ undefined, undefined, undefined, { type: undefined }],
    ];

    let i = 0;
    for (const [uploadObj, queryRes, dataRes, expectedRes] of args) {
      if (i === 1) {
        component.test = { id: '123', content: '', status: 'success', type: 'COMPETENCY_QUESTION'};
      }

      fakeAsync(test)(uploadObj, queryRes, dataRes, expectedRes);
      i++;
    }
  });

  it('should not build summary', async () => {
    const { component } = await initialize();
    component['_buildSummary']();
    expect(component.savedTestSummary).toBeUndefined();
  });

  it('should not build summary', async () => {
    const { component } = await initialize();

    function test(data: TestDetail, expectedResult: Summary[]): void {
      component['_buildSummary'](data as TestDetail);
      expect(component.savedTestSummary).toEqual(jasmine.objectContaining(expectedResult));
    }

    const args: Parameters<typeof test>[] = [
      [
        { id: 'id', content: 'someContent', type: 'COMPETENCY_QUESTION', status: 'running'},
        [
          {label: 'ID', data: 'id'},
          {label: 'Test Case Type', data: 'Competency Question Verification Test'},
          {label: 'Test Case Requirement', data: 'someContent'}
        ]
      ],
      [
        {
          id: 'id',
          content: 'someContent',
          type: 'COMPETENCY_QUESTION',
          status: 'running',
          query: 'query',
          data: 'someData',
          expectedResults: 'expectedResults',
        },
        [
          {label: 'ID', data: 'id'},
          {label: 'Test Case Type', data: 'Competency Question Verification Test'},
          {label: 'Test Case Requirement', data: 'someContent'},
          {label: 'SELECT SPARQL Query', data: 'query'},
          {label: 'Sample dataset', data: 'someData'},
          {label: 'Expected results', data: 'expectedResults'}
        ]
      ],
      [
        {
          id: 'id',
          content: 'someContent',
          type: 'ERROR_PROVOCATION',
          status: 'running',
          query: 'query',
          data: 'someData',
          expectedResults: 'expectedResults',
        },
        [
          {label: 'ID', data: 'id'},
          {label: 'Test Case Type', data: 'Error Provocation Test'},
          {label: 'Test Case Requirement', data: 'someContent'},
          {label: 'Query', data: 'query'},
          {label: 'Sample dataset with errors', data: 'someData'},
          {label: 'Expected results', data: 'expectedResults'}
        ]
      ],
      [
        {
          id: 'id',
          content: 'someContent',
          type: 'COMPETENCY_QUESTION',
          status: 'running',
          queryFileName: 'queryFileName',
          dataFileName: 'dataFileName',
          expectedResultsFileName: 'expectedResultsFileName',
        },
        [
          {label: 'ID', data: 'id'},
          {label: 'Test Case Type', data: 'Competency Question Verification Test'},
          {label: 'Test Case Requirement', data: 'someContent'},
          {label: 'SELECT SPARQL Query file name', data: 'queryFileName'},
          {label: 'Sample dataset file name', data: 'dataFileName'},
          {label: 'Expected results file name', data: 'expectedResultsFileName'}
        ]
      ],
      [
        {
          id: 'id',
          content: 'someContent',
          type: 'ERROR_PROVOCATION',
          status: 'running',
          queryFileName: 'queryFileName',
          dataFileName: 'dataFileName',
          expectedResultsFileName: 'expectedResultsFileName',
        },
        [
          {label: 'ID', data: 'id'},
          {label: 'Test Case Type', data: 'Error Provocation Test'},
          {label: 'Test Case Requirement', data: 'someContent'},
          {label: 'Query file name', data: 'queryFileName'},
          {label: 'Sample dataset with errors file name', data: 'dataFileName'},
          {label: 'Expected results file name', data: 'expectedResultsFileName'}
        ]
      ]
    ];

    for (const [data, expectedResult] of args) {
      test(data, expectedResult);
    }
  });
});
