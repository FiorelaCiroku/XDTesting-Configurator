import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { Fragment, Ontology } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { DashboardComponent } from './dashboard.component';


const apiServiceMock = {
  getFragments: (): Observable<Fragment[]> => of([]),
  listOntologies: (): Observable<Ontology[]> => of([])
} as ApiService;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock }
];

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
