import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';
import { UploadFragmentFileComponent } from './upload-fragment-file.component';


const apiServiceMock = {} as ApiService;
const dynamicDialogRefMock = {} as DynamicDialogRef;
const dynamicDialogConfigMock = {} as DynamicDialogConfig;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock},
  { provide: DynamicDialogRef, useValue: dynamicDialogRefMock},
  { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock}
];

describe('UploadFragmentFileComponent', () => {
  let component: UploadFragmentFileComponent;
  let fixture: ComponentFixture<UploadFragmentFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UploadFragmentFileComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadFragmentFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
