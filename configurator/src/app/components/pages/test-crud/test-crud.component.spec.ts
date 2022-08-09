import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { DialogService } from 'primeng/dynamicdialog';
import { of } from 'rxjs';
import { ApiService } from 'src/app/services';
import { TestCrudComponent } from './test-crud.component';


const apiService = {} as ApiService;
const activatedRouteMock = {
  params: of({})
} as ActivatedRoute;

const dialogServiceMock = {} as DialogService;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiService },
  { provide: ActivatedRoute, useValue: activatedRouteMock },
  { provide: DialogService, useValue: dialogServiceMock }
];

describe('TestCrudComponent', () => {
  let component: TestCrudComponent;
  let fixture: ComponentFixture<TestCrudComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TestCrudComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TestCrudComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
