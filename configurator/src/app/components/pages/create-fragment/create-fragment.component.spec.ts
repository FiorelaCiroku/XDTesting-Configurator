import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { Ontology } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { CreateFragmentComponent } from './create-fragment.component';


const apiServiceMock = {
  listOntologies: (): Observable<Ontology[]> => of([])
} as ApiService;

const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock }
];

describe('CreateFragmentComponent', () => {
  let component: CreateFragmentComponent;
  let fixture: ComponentFixture<CreateFragmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateFragmentComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateFragmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
