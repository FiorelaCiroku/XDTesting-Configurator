import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FileInputFormGroup, FileInputFormGroupSpec } from 'src/app/models';
import { TypedFormControl, TypedFormGroup } from 'src/app/utils/typed-form';
import { FileInputComponent } from './file-input.component';

describe('FileInputComponent', () => {
  let component: FileInputComponent;
  let fixture: ComponentFixture<FileInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FileInputComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly show new file', () => {
    expect(component.shouldShowNewFile()).toBeFalse();

    component.formGroupSpec = {
      formGroup: new TypedFormGroup<FileInputFormGroup>({
        file: new TypedFormControl<FileList>(),
        fileName: new TypedFormControl<string>(),
        content: new TypedFormControl<string>()
      }),
      fileType: 'query',
      label: 'Query'
    };

    component.selectedNewFile = false;
    expect(component.shouldShowNewFile()).toBeFalse();

    component.selectedNewFile = true;
    expect(component.shouldShowNewFile()).toBeFalse();

    component.formGroupSpec.formGroup.controls.fileName.setValue('some file');
    component.currentFile = 'some file';
    expect(component.shouldShowNewFile()).toBeFalse();

    // see https://stackoverflow.com/a/68182158/7432968
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([], ''));

    component.formGroupSpec.formGroup.controls.file.setValue(dataTransfer.files);
    expect(component.shouldShowNewFile()).toBeTrue();

    component.formGroupSpec.formGroup.controls.file.reset();
    component.currentFile = '';
    expect(component.shouldShowNewFile()).toBeTrue();
  });

  it('should reset form group and emit onToggleUploadOrSelectUploaded event', () => {
    const emitSpy = spyOn(component.onToggleUploadOrSelectUploaded, 'emit');

    expect(component.onToggle.bind(component)).not.toThrow();
    expect(emitSpy).toHaveBeenCalledWith(false);

    // see https://stackoverflow.com/a/68182158/7432968
    const dataTransfer = new DataTransfer();
    const fg = new TypedFormGroup<FileInputFormGroup>({
      file: new TypedFormControl<FileList>(dataTransfer.files),
      fileName: new TypedFormControl<string>('some file name'),
      content: new TypedFormControl<string>('some content')
    });

    dataTransfer.items.add(new File([], ''));
    component.formGroupSpec = { formGroup: fg, fileType: 'query', label: 'Query' };

    component.onToggle();
    expect(fg.controls.file.value).toBeFalsy();
    expect(fg.controls.fileName.value).toBeFalsy();
    expect(fg.controls.content!.value).toBeFalsy();

    emitSpy.calls.reset();
    component.uploadFile = true;
    component.onToggle();
    expect(emitSpy).toHaveBeenCalledWith(true);

    emitSpy.calls.reset();
    component.uploadFile = false;
    component.useUploadedFile = true;
    component.onToggle();
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('should emit formGroupSpecs', () => {
    const formGroupSpec: FileInputFormGroupSpec = {
      formGroup: new TypedFormGroup<FileInputFormGroup>({
        file: new TypedFormControl<FileList>(),
        fileName: new TypedFormControl<string>(),
        content: new TypedFormControl<string>()
      }),
      fileType: 'query',
      label: 'Query'
    };

    const emitSpy = spyOn(component.onShowExistingFiles, 'emit');
    component.formGroupSpec = formGroupSpec;

    component.pickExisting();
    expect(component.selectedNewFile).toBeTrue();
    expect(emitSpy).toHaveBeenCalledWith(formGroupSpec);
  });
});
