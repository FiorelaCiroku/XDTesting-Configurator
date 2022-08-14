import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ApiResult, Ontology } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { WindowWrapper } from 'src/app/wrappers';
import { SelectOntologyComponent, UploadOntologyComponent } from '../../modals';
import { OntologyListComponent } from './ontology-list.component';


async function initialize(apiServiceMock?: Partial<ApiService>, dialogServiceMock?: Partial<DialogService>): Promise<{ component: OntologyListComponent; fixture: ComponentFixture<OntologyListComponent> }> {
  apiServiceMock = {
    listOntologies: (): Observable<Ontology[]> => of([]),
    ...(apiServiceMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [ OntologyListComponent ],
    providers: [
      { provide: ApiService, useValue: apiServiceMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
  .overrideComponent(OntologyListComponent, {
    set: {
      providers: [
        { provide: DialogService, useValue: dialogServiceMock ?? {} }
      ]
    }
  })
  .compileComponents();

  const fixture = TestBed.createComponent(OntologyListComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return {fixture, component};
}


describe('OntologyListComponent', () => {
  it('should show error on initialization', async () => {
    const apiServiceMock: Partial<ApiService> = {
      listOntologies: jasmine.createSpy('listOntologies').and.returnValue(throwError(() => 'some error'))
    };
    const { component } = await initialize(apiServiceMock);

    expect(component).toBeTruthy();
    expect(component.showAlert).toBeTrue();
    expect(component.errorMsg).toEqual('some error');
    expect(component.ontologies).toEqual([]);
  });

  it('should not open ontology selection modal', async () => {
    // fake data (also senseless) to test all condition branches
    // and not trigger _showOntologySelectionModal
    const apiServiceMock: Partial<ApiService> = {
      listOntologies: jasmine.createSpy('listOntologies').and.returnValue(of([
        {
          name: 'Ontology 1',
          userDefined: true
        },
        {
          name: 'Ontology 2',
          userDefined: false,
          parsed: true,
          ignored: true
        },
        {
          name: 'Ontology 3',
          userDefined: false,
          parsed: false,
          ignored: true
        },
        {
          name: 'Ontology 4',
          userDefined: false,
          parsed: true,
          ignored: false
        }
      ]))
    };

    const { component } = await initialize(apiServiceMock);

    expect(component.ontologies.map(o => o.name)).toEqual(['Ontology 1', 'Ontology 4']);
  });

  it('should open ontology selection modal', async () => {
    // fake data (also senseless) to test all condition branches
    const listOntologies = jasmine.createSpy('listOntologies').and.returnValue(of([
      {
        name: 'Ontology 1',
        userDefined: true
      },
      {
        name: 'Ontology 2',
        userDefined: false,
        parsed: true
      },
      {
        name: 'Ontology 3',
        userDefined: false,
        parsed: false,
        ignored: true
      },
      {
        name: 'Ontology 4'
      }
    ]));

    const apiServiceMock: Partial<ApiService> = { listOntologies };

    const close$ = new Subject<void>();
    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue({
        onClose: close$.asObservable()
      })
    };

    await initialize(apiServiceMock, dialogServiceMock);

    listOntologies.and.returnValue(of([]));
    close$.next();
    close$.complete();

    expect(dialogServiceMock.open).toHaveBeenCalledWith(SelectOntologyComponent, jasmine.objectContaining({
      header: 'New ontologies found',
      data: {
        toSelect: [{ name: 'Ontology 4' }]
      }
    }));
  });

  it('should open add ontology modal', async () => {
    const close$ = new Subject<void>();
    const dialogServiceMock: Partial<DialogService> = {
      open: jasmine.createSpy('open').and.returnValue({
        onClose: close$.asObservable()
      })
    };
    const initSpy = spyOn<any>(OntologyListComponent.prototype, '_init').and.callThrough();
    const { component, fixture } = await initialize(undefined, dialogServiceMock);

    component.addOntologyModal();
    close$.next();
    close$.complete();

    await fixture.whenStable();

    expect(dialogServiceMock.open).toHaveBeenCalledWith(UploadOntologyComponent, jasmine.objectContaining({ header: 'Add a new ontology' }));
    expect(initSpy).toHaveBeenCalledTimes(2);
  });

  it('should stop deletion on confirmation denial', async () => {
    const apiServiceMock: Partial<ApiService> = {
      deleteOntology: jasmine.createSpy('deleteOntology')
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(false);
    component.deleteOntology('Ontology');

    expect(component.deleting).toBeFalse();
    expect(apiServiceMock.deleteOntology).not.toHaveBeenCalled();
  });

  it('should show deletion errors - caught error', fakeAsync(async () => {
    const deleteOntology$ = new Subject<ApiResult>();
    const apiServiceMock: Partial<ApiService> = {
      deleteOntology: jasmine.createSpy('deleteOntology').and.returnValue(deleteOntology$.asObservable())
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);


    const test = (message?: string): void => {
      component.deleteOntology('Ontology');
      expect(component.deleting).toBeTrue();
      deleteOntology$.next({ success: false, message });
      tick();
      expect(component.deleting).toBeFalse();
      expect(component.errorMsg).toEqual(message || 'Unknown error during deletion of ontology Ontology');
    };

    [undefined, '', 'Some error'].forEach(test);
  }));

  it('should show deletion errors - uncaught error', fakeAsync(async () => {
    const deleteOntology$ = new Subject<ApiResult>();
    const apiServiceMock: Partial<ApiService> = {
      deleteOntology: jasmine.createSpy('deleteOntology').and.returnValue(deleteOntology$.asObservable())
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);

    component.deleteOntology('Ontology');
    expect(component.deleting).toBeTrue();
    deleteOntology$.error('some error');
    tick();
    expect(component.deleting).toBeFalse();
    expect(component.errorMsg).toEqual('some error');
  }));

  it('should not show errors', fakeAsync(async () => {
    const deleteOntology$ = new Subject<ApiResult>();
    const apiServiceMock: Partial<ApiService> = {
      deleteOntology: jasmine.createSpy('deleteOntology').and.returnValue(deleteOntology$.asObservable())
    };
    const { component } = await initialize(apiServiceMock);

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);



    component.deleteOntology('Ontology');
    expect(component.deleting).toBeTrue();
    deleteOntology$.next({ success: true });
    tick();
    expect(component.deleting).toBeFalse();
    expect(component.errorMsg).not.toBeDefined();

  }));
});
