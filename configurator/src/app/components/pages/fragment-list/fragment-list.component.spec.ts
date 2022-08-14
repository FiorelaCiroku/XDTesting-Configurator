import { ElementRef, NO_ERRORS_SCHEMA, Type } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Table } from 'primeng/table';
import { of, Subject } from 'rxjs';
import { ApiResult } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { WindowWrapper } from 'src/app/wrappers';
import { FragmentListComponent } from './fragment-list.component';


describe('FragmentListComponent', () => {
  let component: FragmentListComponent;
  let fixture: ComponentFixture<FragmentListComponent>;

  function getService<T>(service: Type<T>): Partial<T> {
    if (!fixture) {
      throw 'Component not created yet';
    }

    return fixture.debugElement.injector.get(service);
  }


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FragmentListComponent ],
      providers: [
        {
          provide: ApiService,
          useValue: {
            getFragments: jasmine.createSpy('getFragments').and.returnValue(of([])),
          }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FragmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    const apiService = getService(ApiService);
    expect(component).toBeTruthy();
    expect(apiService.getFragments).toHaveBeenCalled();
  });

  it('should clear table\'s filters', async () => {
    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    component.tableFilter = jasmine.createSpyObj<ElementRef>('tableFilter', [], {
      nativeElement: document.createElement('input')
    });

    component.tableFilter!.nativeElement.value = 'Some value';
    component.tableFilter!.nativeElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(component.tableFilter!.nativeElement.value).toEqual('Some value');

    component.clear();

    expect(component.tableFilter!.nativeElement.value).toEqual('');
    expect(component.table!.clear).toHaveBeenCalled();
  });

  it('should not throw error on missing table', async () => {
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should not throw error on missing table filter input', async () => {
    component.table = jasmine.createSpyObj<Table>('table', ['clear']);
    expect(component.clear.bind(component)).not.toThrow();
  });

  it('should filter table globally', async () => {
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });
    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);


    const test = (val: string): void => {
      input.value = val;
      component.filterContent(event);

      expect(component.table!.filterGlobal).toHaveBeenCalledWith(val, 'contains');
    };

    ['', 'some value'].forEach(test);
  });

  it('should not filter on empty event target', async () => {
    const event = new Event('change');
    const targetSpy = spyOnProperty(event, 'target', 'get').and.callThrough();

    component.table = jasmine.createSpyObj<Table>('table', ['filterGlobal']);
    expect(component.filterContent.bind(component, event)).not.toThrow();
    expect(targetSpy).toHaveBeenCalled();
    expect(component.table!.filterGlobal).not.toHaveBeenCalled();
  });

  it('should not throw on empty table while trying to filter globally', async () => {
    const event = new Event('change');
    const input = document.createElement('input');

    Object.defineProperty(event, 'target', { value: input });

    expect(component.filterContent.bind(component, event)).not.toThrow();
  });

  it('should stop deletion on confirmation denial', () => {
    const apiServiceMock = getService(ApiService);
    const deleteFragmentSpy = apiServiceMock.deleteFragment = jasmine.createSpy('deleteFragment');

    spyOn(WindowWrapper, 'confirm').and.returnValue(false);
    component.removeFragment({name: 'Fragment', ontologyName: 'Ontology'});

    expect(component.deleting).toBeFalse();
    expect(deleteFragmentSpy).not.toHaveBeenCalled();
  });

  it('should show deletion errors', fakeAsync(() => {
    const apiServiceMock = getService(ApiService);
    const deleteFragment$ = new Subject<ApiResult>();

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);
    apiServiceMock.deleteFragment = jasmine.createSpy('deleteFragment').and.returnValue(deleteFragment$.asObservable());


    const test = (message?: string): void => {
      component.removeFragment({name: 'Fragment', ontologyName: 'Ontology'});
      expect(component.deleting).toBeTrue();
      deleteFragment$.next({ success: false, message });
      tick();
      expect(component.deleting).toBeFalse();
      expect(component.error).toEqual(message || 'Unknown error during deletion of fragment Fragment');
    };

    [undefined, '', 'Some error'].forEach(test);
  }));

  it('should not show errors', fakeAsync(() => {
    const apiServiceMock = getService(ApiService);
    const deleteFragment$ = new Subject<ApiResult>();

    spyOn(WindowWrapper, 'confirm').and.returnValue(true);
    apiServiceMock.deleteFragment = jasmine.createSpy('deleteFragment').and.returnValue(deleteFragment$.asObservable());


    component.removeFragment({name: 'Fragment', ontologyName: 'Ontology'});
    expect(component.deleting).toBeTrue();
    deleteFragment$.next({ success: true });
    tick();
    expect(component.deleting).toBeFalse();
    expect(component.error).not.toBeDefined();

  }));
});
