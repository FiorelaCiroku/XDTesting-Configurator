import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { Fragment, Ontology, StatusStats } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { DashboardComponent } from './dashboard.component';


async function initialize(apiServiceMock?: Partial<ApiService> | null): Promise<{ component: DashboardComponent; fixture: ComponentFixture<DashboardComponent> }> {
  apiServiceMock = {
    getFragments: (): Observable<Fragment[]> => of([]),
    listOntologies: (): Observable<Ontology[]> => of([]),
    ...(apiServiceMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [ DashboardComponent ],
    providers: [
      { provide: ApiService, useValue: apiServiceMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
  .compileComponents();

  const fixture = TestBed.createComponent(DashboardComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component };
}


describe('DashboardComponent', () => {
  it('should render statistics', async () => {
    const ontologies: Ontology[] = [{
      name: 'Ontology 1'
    }];

    const fragments: Fragment[] = [{
      name: 'Fragment 1',
      ontologyName: 'Ontology 1'
    }, {
      name: 'Fragment 2',
      ontologyName: 'Ontology 1',
      tests: [{
        id: '1',
        status: 'running',
        type: 'COMPETENCY_QUESTION',
        content: ''
      }]
    }];

    const {component} = await initialize({
      getFragments: jasmine.createSpy('getFragments').and.returnValue(of(fragments)),
      listOntologies: jasmine.createSpy('listOntologies').and.returnValue(of(ontologies))
    });

    const resultingStatusStats: StatusStats = {
      running: 1,
      error: 0,
      failed: 0,
      success: 0
    };

    expect(component).toBeTruthy();
    expect(component.ontologies).toBe(1);
    expect(component.fragments).toBe(2);
    expect(component.statusStats).toEqual(resultingStatusStats);
    expect(component.lineData).toEqual(jasmine.objectContaining({
      datasets: [{
        label: 'Ontology 1',
        fill: false,
        data: [
          1, 0, 0
        ]
      }]
    }));
  });
});
