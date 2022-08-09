import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, of } from 'rxjs';
import { Repository } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { LayoutComponent } from './layout.component';



const apiServiceMock = {
  listRepos: (): Observable<Repository[]> => of([])
} as ApiService;
const dialogServiceMock = {} as DialogService;
const dynamicDialogRefMock = {} as DynamicDialogRef;
const dynamicDialogConfigMock = {} as DynamicDialogConfig;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock },
  { provide: DialogService, useValue: dialogServiceMock },
  { provide: DynamicDialogRef, useValue: dynamicDialogRefMock},
  { provide: DynamicDialogConfig, useValue: dynamicDialogConfigMock}
];

describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
      declarations: [ LayoutComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
