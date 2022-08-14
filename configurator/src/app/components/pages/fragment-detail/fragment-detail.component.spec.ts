import { ElementRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of, Subject, throwError } from 'rxjs';
import { ApiResult, ContentFile, Fragment, FragmentDetailParams } from 'src/app/models';
import { TEST_TYPE_DEFINITIONS } from 'src/app/constants';
import { ApiService } from 'src/app/services';
import { FragmentDetailComponent } from './fragment-detail.component';
import { Table } from 'primeng/table';
import { WindowWrapper } from 'src/app/wrappers';
import { UploadFragmentFileComponent, TextDetailsComponent } from '../../modals';


async function initialize(apiServiceMock?: Partial<ApiService>, activatedRouteMock?: Partial<ActivatedRoute>, dialogServiceMock?: Partial<DialogService>): Promise<{ component: FragmentDetailComponent; fixture: ComponentFixture<FragmentDetailComponent>; }> {
  activatedRouteMock = {
    params: of({}),
    ...(activatedRouteMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [FragmentDetailComponent],
    providers: [
      {
        provide: ApiService,
        useValue: apiServiceMock ?? {}
      },
      {
        provide: ActivatedRoute,
        useValue: activatedRouteMock
      }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
    .overrideComponent(FragmentDetailComponent, {
      set: {
        providers: [
          { provide: DialogService, useValue: dialogServiceMock ?? {} }
        ]
      }
    })
    .compileComponents();

  const fixture = TestBed.createComponent(FragmentDetailComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { component, fixture };
}


describe('FragmentDetailComponent', () => {
  it('should not initialize fragment', fakeAsync(async () => {
    const params$ = new Subject<FragmentDetailParams>();
    const getFragmentSpy = jasmine.createSpy('getFragment');
    const { component } = await initialize({ getFragment: getFragmentSpy }, { params: params$.asObservable() });

    expect(component).toBeTruthy();

    const test = (fragmentName?: string | null): void => {
      // to verify that this actually works, change test method from `it` to `fit` and run `npm test -- --code-coverage`
      // then, verify that row 161 is hit once while row 162 is hit thrice
      params$.next({ fragmentName });
      tick();
      expect(getFragmentSpy).not.toHaveBeenCalled();
    };

    [undefined, null, ''].forEach(test);
  }));

  it('should show error', async () => {
    const getFragmentSpy = jasmine.createSpy('getFragment').and.returnValue(throwError(() => 'error'));
    const { component } = await initialize({ getFragment: getFragmentSpy }, { params: of({ fragmentName: 'invalid' }) });

    expect(getFragmentSpy).toHaveBeenCalledWith(undefined, 'invalid');
    expect(component.showAlert).toBeTrue();
    expect(component.errorMsg).toBeDefined();
  });

  it('should initialize fragment', async () => {
    const fragment: Fragment = {
      name: 'Fragment',
      ontologyName: 'Ontology'
    };

    const files: Partial<ContentFile>[] = [{
      name: 'file.txt',
      path: 'path/to/datasets/file.txt'
    }];

    const apiServiceMock: Partial<ApiService> = {
      getFragment: jasmine.createSpy('getFragment').and.returnValue(of(fragment)),
      listTestFiles: jasmine.createSpy('getFragment').and.returnValue(of(files)),
    };

    const { component } = await initialize(apiServiceMock, { params: of({ fragmentName: 'ontology_fragment' }) });

    expect(component.errorMsg).not.toBeDefined();
    expect(component.showAlert).toBeFalse();
    expect(component.fragment).toBe(fragment);
    expect(component.tests).toEqual([]);
    expect(component.fragmentFiles).toEqual([
      {
        name: 'file',
        extension: 'txt',
        type: 'dataset',
        path: 'path/to/datasets/file.txt'
      }
    ]);

    expect(apiServiceMock.getFragment).toHaveBeenCalledWith('fragment', 'ontology');
    expect(apiServiceMock.listTestFiles).toHaveBeenCalledWith(fragment);
  });

  it('should return correct label', async () => {
    const { component } = await initialize();

    expect(component.testLabel('COMPETENCY_QUESTION')).toEqual(TEST_TYPE_DEFINITIONS.COMPETENCY_QUESTION.label);
    expect(component.testLabel('ERROR_PROVOCATION')).toEqual(TEST_TYPE_DEFINITIONS.ERROR_PROVOCATION.label);
    expect(component.testLabel('INFERENCE_VERIFICATION')).toEqual(TEST_TYPE_DEFINITIONS.INFERENCE_VERIFICATION.label);
    expect(component.testLabel.bind(component, <any>'invalid')).toThrow();
  });

  it('should clear table\'s filters', async () => {
    const { component, fixture } = await initialize();

    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    component.tableFilter = jasmine.createSpyObj<ElementRef>('tableFilter', [], {
      nativeElement: document.createElement('input')
    });

    component.tableFilter!.nativeElement.value = 'Some value';
    component.tableFilter!.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.tableFilter!.nativeElement.value).toEqual('Some value');

    component.clear();

    expect(component.tableFilter!.nativeElement.value).toEqual('');
    expect(component.table!.clear).toHaveBeenCalled();
  });

  it('should not throw error on missing table', async () => {
    const { component } = await initialize();
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should not throw error on missing table filter input', async () => {
    const { component } = await initialize();
    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should filter table globally', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });
    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);


    const test = (val: string): void => {
      input.value = val;
      component.filterContent(event);

      expect(component.table!.filterGlobal).toHaveBeenCalledWith(val, 'contains');
    };

    ['', 'some value'].forEach(test);
  });

  it('should not filter on empty event target', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const targetSpy = spyOnProperty(event, 'target', 'get').and.callThrough();

    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);
    expect(component.filterContent.bind(component, event)).not.toThrow();
    expect(targetSpy).toHaveBeenCalled();
    expect(component.table!.filterGlobal).not.toHaveBeenCalled();
  });

  it('should not throw on empty table while trying to filter globally', async () => {
    const { component } = await initialize();
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });

    expect(component.filterContent.bind(component, event)).not.toThrow();
  });

  it('should stop deletion on confirmation denial', async () => {
    const apiServiceMock: Partial<ApiService> = {
      deleteTestFromFragment: jasmine.createSpy('deleteFragment')
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(false);
    component.deleteTest('someId');

    expect(component.deleting).toBeFalse();
    expect(apiServiceMock.deleteTestFromFragment).not.toHaveBeenCalled();
  });

  it('should stop deletion on empty fragment', async () => {
    const apiServiceMock: Partial<ApiService> = {
      deleteTestFromFragment: jasmine.createSpy('deleteFragment')
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);
    component.fragment = undefined;
    component.deleteTest('someId');

    expect(component.deleting).toBeFalse();
    expect(apiServiceMock.deleteTestFromFragment).not.toHaveBeenCalled();
  });

  it('should deletion errors', async () => {
    const deleteTestFromFragment$ = new Subject<ApiResult>();
    const fragment: Fragment = { name: 'Fragment', ontologyName: 'Ontology' };
    const apiServiceMock: Partial<ApiService> = {
      getFragment: jasmine.createSpy('getFragment').and.returnValue(of(fragment)),
      deleteTestFromFragment: jasmine.createSpy('deleteFragment').and.returnValue(deleteTestFromFragment$.asObservable())
    };
    const { component, fixture } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);
    component.fragment = fragment;
    component.deleteTest('someId');

    expect(component.deleting).toBeTrue();

    deleteTestFromFragment$.next({ success: false, message: 'Some error'});
    deleteTestFromFragment$.complete();

    await fixture.whenStable();

    expect(component.deleting).toBeFalse();
    expect(component.errorMsg).toEqual('Some error');
    expect(component.successMsg).not.toBeDefined();
    expect(component.showAlert).toBeTrue();
    expect(component.fragment).toBe(fragment);
  });

  it('should show positive feedback on deletion success', async () => {
    const deleteTestFromFragment$ = new Subject<ApiResult>();
    const fragment: Fragment = { name: 'Fragment', ontologyName: 'Ontology' };
    const apiServiceMock: Partial<ApiService> = {
      getFragment: jasmine.createSpy('getFragment').and.returnValue(of(fragment)),
      deleteTestFromFragment: jasmine.createSpy('deleteFragment').and.returnValue(deleteTestFromFragment$.asObservable())
    };
    const { component, fixture } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);
    component.fragment = fragment;
    component.deleteTest('someId');

    expect(component.deleting).toBeTrue();

    deleteTestFromFragment$.next({ success: true });
    deleteTestFromFragment$.complete();

    await fixture.whenStable();

    expect(component.deleting).toBeFalse();
    expect(component.errorMsg).not.toBeDefined();
    expect(component.successMsg).toEqual('Test deleted successfully.');
    expect(component.showAlert).toBeTrue();
    expect(component.fragment).toBe(fragment);
  });

  it('should open modal and re-initialize files', async () => {
    const fragment: Fragment = { name: 'Fragment', ontologyName: 'Ontology' };
    const dynamicDialogRefMock: Partial<DynamicDialogRef> = {
      onClose: of(undefined)
    };

    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue(dynamicDialogRefMock)
    };

    const { component, fixture } = await initialize(undefined, undefined, dialogServiceMock);
    const initFilesSpy = spyOn<any>(component, '_initFiles').and.returnValue(of(undefined));

    component.fragment = fragment;
    component.uploadFiles();

    await fixture.whenStable();

    expect(dialogServiceMock.open).toHaveBeenCalledWith(UploadFragmentFileComponent, jasmine.objectContaining({
      header: 'Upload a new file',
      data: { fragment }
    }));

    expect(initFilesSpy).toHaveBeenCalled();
  });

  it('should open modal and not re-initialize files', async () => {
    const dynamicDialogRefMock: Partial<DynamicDialogRef> = {
      onClose: of(undefined)
    };

    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue(dynamicDialogRefMock)
    };

    const { component, fixture } = await initialize(undefined, undefined, dialogServiceMock);
    const initFilesSpy = spyOn<any>(component, '_initFiles').and.returnValue(of(undefined));

    component.uploadFiles();

    await fixture.whenStable();

    expect(dialogServiceMock.open).toHaveBeenCalledWith(UploadFragmentFileComponent, jasmine.objectContaining({
      header: 'Upload a new file',
      data: { fragment: undefined }
    }));

    expect(initFilesSpy).not.toHaveBeenCalled();
  });

  it('should open details modal', async () => {
    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open')
    };
    const { component } = await initialize(undefined, undefined, dialogServiceMock);

    component.testNotes({id: 'id', content: '', status: 'running', type: 'COMPETENCY_QUESTION', statusNotes: 'notes'});

    expect(dialogServiceMock.open).toHaveBeenCalledWith(TextDetailsComponent, jasmine.objectContaining({
      header: 'Status notes for test id',
      data: { notes: 'notes' }
    }));
  });
});
