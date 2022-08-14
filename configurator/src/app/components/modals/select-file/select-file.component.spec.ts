import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { ContentFile, FragmentFile } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { SelectFileComponent } from './select-file.component';


describe('SelectFileComponent', () => {
  let component: SelectFileComponent;
  let fixture: ComponentFixture<SelectFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectFileComponent ],
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
    fixture = TestBed.createComponent(SelectFileComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should stop', () => {
    function test(fragment?: string | null, fileType?: string | null): void {
      const apiServiceMock = fixture.debugElement.injector.get(ApiService);
      const dynamicDialogConfigMock = fixture.debugElement.injector.get(DynamicDialogConfig);

      apiServiceMock.listTestFiles = jasmine.createSpy('listTestFiles');
      dynamicDialogConfigMock.data = { fragment, fileType };

      fixture.detectChanges();

      expect(apiServiceMock.listTestFiles).not.toHaveBeenCalled();
    }

    const args: Parameters<typeof test>[] = [
      [undefined, undefined],
      [null, undefined],
      ['fragment', undefined],
      [undefined, null],
      [null, null],
      ['fragment', null],
      [undefined, 'type'],
      [null, 'type']
    ];

    args.forEach(([fragment, fileType]) => test(fragment, fileType));
  });

  it('should load files', async () => {
    const apiServiceMock = fixture.debugElement.injector.get(ApiService);
    const dynamicDialogConfigMock = fixture.debugElement.injector.get(DynamicDialogConfig);
    const files: Partial<ContentFile>[] = [{
      name: 'file.something.txt',
      path: 'some/path/to/file.something.txt'
    }, {
      name: 'file2.something.txt',
      path: 'some/path/to/expectedResults/file2.something.txt'
    }];

    apiServiceMock.listTestFiles = jasmine.createSpy('listTestFiles').and.returnValue(of(files));
    dynamicDialogConfigMock.data = { fragment: 'fragment', fileType: 'fileType' };

    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiServiceMock.listTestFiles).toHaveBeenCalled();
    expect(component.loading).toBeFalse();
    expect(component.files.length).toBe(2);
    expect(component.files[0]).toEqual({
      name: 'file.something',
      extension: 'txt',
      type: 'query',
      path: files[0].path!
    });

    expect(component.files[1]).toEqual({
      name: 'file2.something',
      extension: 'txt',
      type: 'expectedResults',
      path: files[1].path!
    });
  });

  it('should close modal returning selected file', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const dynamicDialogRefMock = fixture.debugElement.injector.get(DynamicDialogRef);
    const selectedFragmentFile: FragmentFile = {
      name: 'file',
      path: 'path/to',
      type: 'query',
      extension: 'txt'
    };

    dynamicDialogRefMock.close = jasmine.createSpy('close').and.callFake((file: FragmentFile) => {
      expect(file).toBe(selectedFragmentFile);
    });

    component.onFileSelected(selectedFragmentFile);
    expect(dynamicDialogRefMock.close).toHaveBeenCalled();
  });
});
