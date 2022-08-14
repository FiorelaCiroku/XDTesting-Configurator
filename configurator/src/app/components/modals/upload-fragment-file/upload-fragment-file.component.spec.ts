import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { Subject } from 'rxjs';
import { ApiResult } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { UploadFragmentFileComponent } from './upload-fragment-file.component';



describe('UploadFragmentFileComponent', () => {
  let component: UploadFragmentFileComponent;
  let fixture: ComponentFixture<UploadFragmentFileComponent>;
  let event: Event;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadFragmentFileComponent ],
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: DynamicDialogRef, useValue: {} },
        { provide: DynamicDialogConfig, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadFragmentFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    event = new Event('submit', {cancelable: true, bubbles: false});
  });


  it('should display error on unknown fragment', () => {
    // check creation
    expect(component).toBeTruthy();

    const validSpy = spyOnProperty(component.formGroup, 'valid', 'get');
    component.upload(event);

    expect(component.errorMsg).toEqual('Unknown fragment. Application error');
    expect(component.showAlert).toBeTrue();
    expect(validSpy).not.toHaveBeenCalled();
  });

  it('should mark all as touched and dirty on invalid form', () => {
    const controls = Object.values(component.formGroup.controls);
    fixture.debugElement.injector.get(DynamicDialogConfig).data = { fragment: {} };
    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(false);
    component.upload(event);


    expect(component.errorMsg).not.toBeDefined();
    expect(controls.reduce((acc, ctrl) => acc && ctrl.dirty, true)).toBeTrue();
    expect(controls.reduce((acc, ctrl) => acc && ctrl.touched, true)).toBeTrue();
  });

  it('should display error on null FormGroup value', () => {
    const disableSpy = spyOn(component.formGroup, 'disable');
    fixture.debugElement.injector.get(DynamicDialogConfig).data = { fragment: {} };
    component.formGroup = jasmine.createSpyObj('formGroup', [], {valid: true, value: null});
    component.upload(event);

    expect(component.errorMsg).toEqual('Unknown error');
    expect(component.showAlert).toBeTrue();
    expect(disableSpy).not.toHaveBeenCalled();
  });

  it('should upload files', async () => {
    const upload$ = new Subject<ApiResult>();

    fixture.debugElement.injector.get(DynamicDialogConfig).data = { fragment: {} };
    fixture.debugElement.injector.get(ApiService).uploadTestFile = jasmine.createSpy('uploadTestFile').and.returnValue(upload$.asObservable());
    component.formGroup.setValue({
      file: [new File([], '')],
      fileType: 'query'
    });

    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);

    component.upload(event);

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
    expect(component.successMsg).toEqual('Files uploaded successfully');
  });

  it('should show upload errors - caught api error', async () => {
    const upload$ = new Subject<ApiResult>();

    fixture.debugElement.injector.get(DynamicDialogConfig).data = { fragment: {} };
    fixture.debugElement.injector.get(ApiService).uploadTestFile = jasmine.createSpy('uploadTestFile').and.returnValue(upload$.asObservable());
    component.formGroup.setValue({
      file: [new File([], '')],
      fileType: 'query'
    });

    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);

    component.upload(event);

    expect(component.errorMsg).not.toBeDefined();
    expect(component.formGroup.disabled).toBeTrue();
    expect(component.uploading).toBeTrue();

    upload$.next({ success: false, message: 'API ERROR' });
    upload$.complete();

    await fixture.whenStable();

    expect(component.uploading).toBeFalse();
    expect(component.showAlert).toBeTrue();
    expect(component.formGroup.disabled).toBeFalse();
    expect(component.successMsg).not.toBeDefined();
    expect(component.errorMsg).toEqual('API ERROR');
  });

  it('should show upload errors - general error', async () => {
    const upload$ = new Subject<ApiResult>();

    fixture.debugElement.injector.get(DynamicDialogConfig).data = { fragment: {} };
    fixture.debugElement.injector.get(ApiService).uploadTestFile = jasmine.createSpy('uploadTestFile').and.returnValue(upload$.asObservable());
    component.formGroup.setValue({
      file: [new File([], '')],
      fileType: 'query'
    });

    spyOnProperty(component.formGroup, 'valid', 'get').and.returnValue(true);

    component.upload(event);

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
});
