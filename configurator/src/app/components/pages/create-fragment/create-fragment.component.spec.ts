import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ApiResult, Ontology } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { CreateFragmentComponent } from './create-fragment.component';


async function initialize(apiServiceMock?: Partial<ApiService> | null): Promise<{ component: CreateFragmentComponent; fixture: ComponentFixture<CreateFragmentComponent> }> {
  apiServiceMock = {
    listOntologies(): Observable<Ontology[]> { return of([]); },
    ...(apiServiceMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [CreateFragmentComponent],
    providers: [
      { provide: ApiService, useValue: apiServiceMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
    .compileComponents();

  const fixture = TestBed.createComponent(CreateFragmentComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component };
}

function apiServiceMockSetup(): { uploadFragmentFile$: Subject<ApiResult<string>>; createFragment$: Subject<ApiResult>; apiServiceMock: Partial<ApiService> } {
  const uploadFragmentFile$ = new Subject<ApiResult<string>>();
  const createFragment$ = new Subject<ApiResult>();
  const apiServiceMock: Partial<ApiService> = {
    uploadFragmentFile: jasmine.createSpy('uploadFragmentFile').and.returnValue(uploadFragmentFile$.asObservable()),
    createFragment: jasmine.createSpy('uploadFragmentFile').and.returnValue(createFragment$.asObservable())
  };

  return { apiServiceMock, uploadFragmentFile$, createFragment$ };
}

async function errorsSetup(apiServiceMock: Partial<ApiService>, apiCalls: () => void, tests?: (component: CreateFragmentComponent) => void): Promise<void> {
  const { component, fixture } = await initialize(apiServiceMock);

  spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);
  component.formGroup.setValue({
    file: [new File([], '')],
    name: 'Fragment 1',
    ontologyName: 'Ontology 1'
  });

  component.createFragment();

  expect(component.formGroup.disabled).toBeTrue();

  apiCalls();
  await fixture.whenStable();

  expect(component.formGroup.disabled).toBeFalse();
  expect(component.saved).toBeFalse();
  expect(component.showAlert).toBeTrue();
  expect(component.summary).toEqual([]);

  tests?.(component);
}


describe('CreateFragmentComponent', () => {
  it('should set ontologies', async () => {
    const ontologies: Ontology[] = [{
      name: 'Ontology 1'
    }];

    const { component } = await initialize({
      listOntologies: jasmine.createSpy('listOntologies').and.returnValue(of(ontologies))
    });

    expect(component).toBeTruthy();
    expect(component.formGroup).toBeDefined();
    expect(component.ontologies).toBe(ontologies);
  });

  it('should catch errors and set empty ontologies', async () => {
    const { component } = await initialize({
      listOntologies: jasmine.createSpy('listOntologies').and.returnValue(throwError(() => 'Some error'))
    });

    expect(component).toBeTruthy();
    expect(component.formGroup).toBeDefined();
    expect(component.ontologies).toEqual([]);
    expect(component.errorMsg).toEqual('Some error');
    expect(component.showAlert).toBeTrue();
  });

  it('should stop on invalid form', async () => {
    const { component } = await initialize();
    const controls = Object.values(component.formGroup);
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(false);

    component.createFragment();

    expect(controls.reduce((acc, ctrl) => acc && ctrl.touched, true));
    expect(controls.reduce((acc, ctrl) => acc && ctrl.dirty, true));
    expect(component.formGroup.disabled).toBeFalse();
  });

  it('should stop on invalid form', async () => {
    const { apiServiceMock, uploadFragmentFile$, createFragment$ } = apiServiceMockSetup();
    const { component } = await initialize(apiServiceMock);

    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);
    component.formGroup.setValue({
      file: [new File([], '')],
      name: 'Fragment 1',
      ontologyName: 'Ontology 1'
    });

    component.createFragment();

    expect(component.formGroup.disabled).toBeTrue();

    uploadFragmentFile$.next({ success: true, data: 'filename' });
    uploadFragmentFile$.complete();
    createFragment$.next({ success: true });
    createFragment$.complete();

    expect(component.formGroup.disabled).toBeFalse();
    expect(apiServiceMock.createFragment).toHaveBeenCalledWith(jasmine.objectContaining({ fileName: 'Ontology 1/Fragment 1/filename' }));
    expect(component.saved).toBeTrue();
    expect(component.showAlert).toBeTrue();
    expect(component.errorMsg).not.toBeDefined();
    expect(component.summary).toEqual([{
      label: 'Ontology Name',
      data: 'Ontology 1',
    }, {
      label: 'Ontology fragment Name',
      data: 'Fragment 1'
    }]);
  });

  it('should show uploadFragmentFile caught error', async () => {
    const { apiServiceMock, uploadFragmentFile$ } = apiServiceMockSetup();
    await errorsSetup(apiServiceMock,
      (): void => {
        uploadFragmentFile$.next({ success: false, message: 'some uploadFragmentFile error' });
        uploadFragmentFile$.complete();
      },
      (component) => {
        expect(component.errorMsg).toEqual('some uploadFragmentFile error');
        expect(apiServiceMock.createFragment).not.toHaveBeenCalled();
      }
    );
  });

  it('should show createFragment caught errors', async () => {
    const { apiServiceMock, uploadFragmentFile$, createFragment$ } = apiServiceMockSetup();
    await errorsSetup(apiServiceMock,
      (): void => {
        uploadFragmentFile$.next({ success: true, data: 'filename' });
        uploadFragmentFile$.complete();
        createFragment$.next({ success: false, message: 'some createFragment error' });
        createFragment$.complete();
      },
      (component) => {
        expect(apiServiceMock.createFragment).toHaveBeenCalledWith(jasmine.objectContaining({ fileName: 'Ontology 1/Fragment 1/filename' }));
        expect(component.errorMsg).toEqual('some createFragment error');
      }
    );
  });

  it('should show createFragment caught errors', async () => {
    const { apiServiceMock, uploadFragmentFile$ } = apiServiceMockSetup();
    await errorsSetup(apiServiceMock,
      (): void => {
        uploadFragmentFile$.error('some uploadFragmentFile error');
        uploadFragmentFile$.complete();
      },
      (component) => {
        expect(component.errorMsg).toEqual('some uploadFragmentFile error');
      }
    );
  });

  it('should show createFragment caught errors', async () => {
    const { apiServiceMock, uploadFragmentFile$, createFragment$ } = apiServiceMockSetup();
    await errorsSetup(apiServiceMock,
      (): void => {
        uploadFragmentFile$.next({ success: true, data: 'filename' });
        uploadFragmentFile$.complete();
        createFragment$.error('some createFragment error');
        createFragment$.complete();
      },
      (component) => {
        expect(apiServiceMock.createFragment).toHaveBeenCalledWith(jasmine.objectContaining({ fileName: 'Ontology 1/Fragment 1/filename' }));
        expect(component.errorMsg).toEqual('some createFragment error');
      }
    );
  });

  it('should handle empty formGroup value', async () => {
    const { apiServiceMock, uploadFragmentFile$, createFragment$ } = apiServiceMockSetup();
    const { component } = await initialize(apiServiceMock);

    component.formGroup = jasmine.createSpyObj('formGroup', {
      disable() {
        //
      },
      enable() {
        //
      }
    }, {
      valid: true,
      value: null
    });

    component.createFragment();

    expect(apiServiceMock.uploadFragmentFile).toHaveBeenCalledWith(undefined, jasmine.objectContaining({
      name: '',
      ontologyName: ''
    }));

    uploadFragmentFile$.next({ success: true });
    createFragment$.next({ success: true });

    expect(component.summary).toEqual(jasmine.objectContaining([{
      label: 'Ontology Name',
      data: '',
    }, {
      label: 'Ontology fragment Name',
      data: ''
    }]));
  });

  it('should handle empty file', async () => {
    const { apiServiceMock, uploadFragmentFile$, createFragment$ } = apiServiceMockSetup();
    const { component } = await initialize(apiServiceMock);


    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);
    component.formGroup.patchValue({
      ontologyName: 'Ontology',
      name: 'Fragment'
    });
    component.createFragment();

    expect(apiServiceMock.uploadFragmentFile).toHaveBeenCalledWith(undefined, jasmine.objectContaining({
      name: 'Fragment',
      ontologyName: 'Ontology'
    }));

    uploadFragmentFile$.next({ success: true });
    createFragment$.next({ success: true });

    expect(component.summary).toEqual(jasmine.objectContaining([{
      label: 'Ontology Name',
      data: 'Ontology',
    }, {
      label: 'Ontology fragment Name',
      data: 'Fragment'
    }]));
  });
});
