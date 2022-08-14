import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Subject } from 'rxjs';
import { ApiResult } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { UploadOntologyComponent } from './upload-ontology.component';


const apiServiceMock = {} as ApiService;
const dynamicDialogRefMock = {} as DynamicDialogRef;
const dynamicDialogConfigMock = {} as DynamicDialogConfig;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock},
  { provide: DynamicDialogRef, useValue: dynamicDialogRefMock},
  { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock}
];

describe('UploadOntologyComponent', () => {
  let component: UploadOntologyComponent;
  let fixture: ComponentFixture<UploadOntologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadOntologyComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadOntologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should mark all as touched and dirty on invalid form', () => {
    const controls = Object.values(component.formGroup.controls);
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(false);
    component.upload();


    expect(component.errorMsg).not.toBeDefined();
    expect(controls.reduce((acc, ctrl) => acc && ctrl.dirty, true)).toBeTrue();
    expect(controls.reduce((acc, ctrl) => acc && ctrl.touched, true)).toBeTrue();
  });

  it('should display error on null FormGroup value', () => {
    const disableSpy = spyOn(component.formGroup, 'disable');
    component.formGroup = jasmine.createSpyObj('formGroup', [], {valid: true, value: null});
    component.upload();

    expect(component.errorMsg).toEqual('Unknown error');
    expect(component.showAlert).toBeTrue();
    expect(disableSpy).not.toHaveBeenCalled();
  });

  it('should upload files', async () => {
    const upload$ = new Subject<ApiResult>();

    fixture.debugElement.injector.get(ApiService).uploadOntology = jasmine.createSpy('uploadOntology').and.returnValue(upload$.asObservable());
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);
    component.upload();

    expect(component.errorMsg).not.toBeDefined();
    expect(component.formGroup.disabled).toBeTrue();
    expect(component.uploading).toBeTrue();

    upload$.next({ success: true });
    upload$.complete();

    await fixture.whenStable();

    expect(component.uploading).toBeFalse();
    expect(component.showAlert).toBeTrue();
    expect(component.formGroup.disabled).toBeFalse();
    expect(component.errorMsg).not.toBeDefined();
    expect(component.successMsg).toEqual('Ontology uploaded successfully');
  });

  it('should show upload errors - caught api error', fakeAsync(() => {
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);

    function test(errorMsg?: string): void {
      const upload$ = new Subject<ApiResult>();
      fixture.debugElement.injector.get(ApiService).uploadOntology = jasmine.createSpy('uploadOntology').and.returnValue(upload$.asObservable());
      component.upload();

      expect(component.errorMsg).not.toBeDefined();
      expect(component.formGroup.disabled).toBeTrue();
      expect(component.uploading).toBeTrue();

      upload$.next({ success: false, message: errorMsg });
      upload$.complete();

      tick(); // flush subscription

      expect(component.uploading).toBeFalse();
      expect(component.showAlert).toBeTrue();
      expect(component.formGroup.disabled).toBeFalse();
      expect(component.successMsg).not.toBeDefined();
      expect(component.errorMsg).toEqual(errorMsg || 'Unknown error');
    }

    [undefined, 'API ERROR'].forEach(test);
  }));

  it('should show upload errors - general error', async () => {
    const upload$ = new Subject<ApiResult>();

    fixture.debugElement.injector.get(ApiService).uploadOntology = jasmine.createSpy('uploadOntology').and.returnValue(upload$.asObservable());
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);
    component.upload();

    expect(component.errorMsg).not.toBeDefined();
    expect(component.formGroup.disabled).toBeTrue();
    expect(component.uploading).toBeTrue();

    upload$.error('some error');
    upload$.complete();

    await fixture.whenStable();

    expect(component.uploading).toBeFalse();
    expect(component.showAlert).toBeTrue();
    expect(component.formGroup.disabled).toBeFalse();
    expect(component.successMsg).not.toBeDefined();
    expect(component.errorMsg).toEqual('some error');
  });

  it('should reset ontology file in form on toggle between file upload and reference', () => {
    const fg = component.formGroup;
    fg.setValue({
      name: 'Some ontology',
      file: [new File([], '')],
      url: 'some url'
    });

    component.onToggle();

    expect(fg.controls.name.value).toEqual('Some ontology');
    expect(fg.controls.file.value).not.toBeDefined();
    expect(fg.controls.url.value).not.toBeDefined();
  });
});
