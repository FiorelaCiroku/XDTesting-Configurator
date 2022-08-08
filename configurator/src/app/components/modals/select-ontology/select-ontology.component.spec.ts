import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Provider } from '@angular/core';
import { SelectOntologyComponent } from './select-ontology.component';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';


const apiServiceMock = {} as ApiService;
const dynamicDialogRefMock = {} as DynamicDialogRef;
const dynamicDialogConfigMock = {} as DynamicDialogConfig;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock},
  { provide: DynamicDialogRef, useValue: dynamicDialogRefMock},
  { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock}
];

describe('SelectOntologyComponent', () => {
  let component: SelectOntologyComponent;
  let fixture: ComponentFixture<SelectOntologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectOntologyComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectOntologyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
