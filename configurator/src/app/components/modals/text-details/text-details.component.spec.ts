import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';
import { TextDetailsComponent } from './text-details.component';

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

describe('TextDetailsComponent', () => {
  let component: TextDetailsComponent;
  let fixture: ComponentFixture<TextDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TextDetailsComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TextDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
