import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { SelectOntologyComponent } from './select-ontology.component';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';
import { ApiResult, Ontology } from 'src/app/models';
import { Subject } from 'rxjs';



describe('SelectOntologyComponent', () => {
  let component: SelectOntologyComponent;
  let fixture: ComponentFixture<SelectOntologyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SelectOntologyComponent ],
      providers: [
        { provide: ApiService, useValue: {} },
        { provide: DynamicDialogRef, useValue: {} },
        { provide: DynamicDialogConfig, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectOntologyComponent);
    component = fixture.componentInstance;
  });



  it('should not set toSelect', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(component.toSelect).toEqual([]);
  });


  it('should set toSelect', () => {
    const dynamicDialogConfigMock = fixture.debugElement.injector.get(DynamicDialogConfig);
    const toSelect: Ontology[] = [{
      name: 'Ontology 1'
    }];

    dynamicDialogConfigMock.data = { toSelect };
    fixture.detectChanges();

    expect(component.toSelect).toBe(toSelect);
  });


  it('should save ontologies', async () => {
    const dynamicDialogConfigMock = fixture.debugElement.injector.get(DynamicDialogConfig);
    const apiServiceMock = fixture.debugElement.injector.get(ApiService);
    const apiObs$ = new Subject<ApiResult>();
    const toSelect: Ontology[] = [{
      name: 'Ontology 1'
    }, {
      name: 'Ontology 2'
    }];

    dynamicDialogConfigMock.data = { toSelect };
    apiServiceMock.updateOntologies = jasmine.createSpy('updateOntology').and.returnValue(apiObs$.asObservable());

    fixture.detectChanges();

    component.selectedOntologies = [toSelect[0]];
    component.save();

    expect(component.saving).toBeTrue();
    expect(component.toSelect[0]).toEqual({ ...toSelect[0], ignored: false, parsed: true, userDefined: false });
    expect(component.toSelect[1]).toEqual({ ...toSelect[1], ignored: true, parsed: true, userDefined: false });

    apiObs$.next({ success: true });
    await fixture.whenStable();

    expect(component.success).toBeTrue();
    expect(component.message).toEqual('Ontologies saved successfully');
    expect(component.showAlert).toBeTrue();
    expect(component.saving).toBeFalse();
  });


  it('should catch errors', async () => {
    const apiServiceMock = fixture.debugElement.injector.get(ApiService);
    const apiObs$ = new Subject<ApiResult>();

    apiServiceMock.updateOntologies = jasmine.createSpy('updateOntology').and.returnValue(apiObs$.asObservable());

    component.toSelect = [];
    component.save();
    apiObs$.error('Some error');
    await fixture.whenStable();

    expect(component.success).toBeFalse();
    expect(component.message).toEqual('Some error');
    expect(component.showAlert).toBeTrue();
    expect(component.saving).toBeFalse();
  });


  it('should show api errors', async () => {
    const apiServiceMock = fixture.debugElement.injector.get(ApiService);
    const apiObs$ = new Subject<ApiResult>();

    apiServiceMock.updateOntologies = jasmine.createSpy('updateOntology').and.returnValue(apiObs$.asObservable());

    component.toSelect = [];
    component.save();
    apiObs$.next({ success: false, message: 'Some error' });
    await fixture.whenStable();

    expect(component.success).toBeFalse();
    expect(component.message).toEqual('Some error');
    expect(component.showAlert).toBeTrue();
    expect(component.saving).toBeFalse();
  });
});
