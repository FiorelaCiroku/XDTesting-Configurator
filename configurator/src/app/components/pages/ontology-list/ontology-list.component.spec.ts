import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, of } from 'rxjs';
import { Ontology } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { OntologyListComponent } from './ontology-list.component';


const apiService = {
  listOntologies: (): Observable<Ontology[]> => of([])
} as ApiService;
const dialogServiceMock = {} as DialogService;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiService },
  { provide: DialogService, useValue: dialogServiceMock }
];

describe('OntologyListComponent', () => {
  let component: OntologyListComponent;
  let fixture: ComponentFixture<OntologyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OntologyListComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OntologyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
