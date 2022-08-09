import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';
import { SelectFileComponent } from './select-file.component';


const apiServiceMock = {} as ApiService;
const dynamicDialogRefMock = {} as DynamicDialogRef;
const dynamicDialogConfigMock = {
  data: {}
} as DynamicDialogConfig;

const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock},
  { provide: DynamicDialogRef, useValue: dynamicDialogRefMock},
  { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock}
];

describe('SelectFileComponent', () => {
  let component: SelectFileComponent;
  let fixture: ComponentFixture<SelectFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectFileComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
