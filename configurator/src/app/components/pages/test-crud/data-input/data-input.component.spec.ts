import { NO_ERRORS_SCHEMA, ProviderToken } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlContainer } from '@angular/forms';
import { DataSpec, TestDetailForm } from 'src/app/models';
import { TypedFormArray, TypedFormControl, TypedFormGroup } from 'src/app/utils/typed-form';
import { DataInputComponent } from './data-input.component';



describe('DataInputComponent', () => {
  let component: DataInputComponent;
  let fixture: ComponentFixture<DataInputComponent>;

  function getService<T>(service: ProviderToken<T>): T {
    if (!fixture) {
      throw 'You must create component first';
    }

    return fixture.debugElement.injector.get(service);
  }


  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataInputComponent],
      providers: [
        { provide: ControlContainer, useValue: {} }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataInputComponent);
    component = fixture.componentInstance;
  });

  it('should return correct title w.r.t. input properties', () => {
    expect(component.title).toEqual('Sample dataset with expected results');

    component.onlyExpectedResults = true;
    fixture.detectChanges();
    expect(component.title).toEqual('Sample dataset with expected results');

    component.withExpectedResults = false;
    fixture.detectChanges();
    expect(component.title).toEqual('Expected results');

    component.onlyExpectedResults = false;
    fixture.detectChanges();
    expect(component.title).toEqual('Sample dataset');
  });

  it('should return rows', () => {
    const controls: TypedFormGroup<DataSpec>[] = [
      new TypedFormGroup<DataSpec>({
        expectedResult: new TypedFormControl<boolean>(),
        object: new TypedFormControl<string>(),
        predicate: new TypedFormControl<string>(),
        subject: new TypedFormControl<string>(),
        graph: new TypedFormControl<string>()
      })
    ];
    const fg = new TypedFormGroup<TestDetailForm['dataContent']>({
      rows: new TypedFormArray<DataSpec>(controls),
      prefixes: new TypedFormControl<string>()
    });

    const controlContainerMock = getService(ControlContainer);
    Object.defineProperty(controlContainerMock, 'control', { value: fg });

    fixture.detectChanges(); // ngOnInit
    expect(component.rows).toBe(controls);
  });

  it('should return empty rows on missing form group', () => {
    expect(component.rows).toEqual([]);
  });

  it('should add a row', () => {
    const controls: TypedFormGroup<DataSpec>[] = [];
    const fg = new TypedFormGroup<TestDetailForm['dataContent']>({
      rows: new TypedFormArray<DataSpec>(controls),
      prefixes: new TypedFormControl<string>()
    });

    const controlContainerMock = getService(ControlContainer);
    Object.defineProperty(controlContainerMock, 'control', { value: fg });

    fixture.detectChanges(); // ngOnInit
    component.addDataRow();

    expect(controls.length).toEqual(1);
  });

  it('should not throw when adding a row on missing form group', () => {
    expect(component.addDataRow.bind(component)).not.toThrow();
  });

  it('should delete a row', () => {
    const controls: TypedFormGroup<DataSpec>[] = [
      new TypedFormGroup<DataSpec>({
        expectedResult: new TypedFormControl<boolean>(),
        object: new TypedFormControl<string>(),
        predicate: new TypedFormControl<string>(),
        subject: new TypedFormControl<string>(),
        graph: new TypedFormControl<string>()
      })
    ];
    const fg = new TypedFormGroup<TestDetailForm['dataContent']>({
      rows: new TypedFormArray<DataSpec>(controls),
      prefixes: new TypedFormControl<string>()
    });

    const controlContainerMock = getService(ControlContainer);
    Object.defineProperty(controlContainerMock, 'control', { value: fg });

    fixture.detectChanges(); // ngOnInit
    component.removeDataRow(0);

    expect(controls.length).toEqual(0);
  });

  it('should not throw when deleting a row on missing form group', () => {
    expect(component.removeDataRow.bind(component)).not.toThrow();
  });

  it('should not throw passing a out-of-bounds row index to removeDataRow', () => {
    const controls: TypedFormGroup<DataSpec>[] = [
      new TypedFormGroup<DataSpec>({
        expectedResult: new TypedFormControl<boolean>(),
        object: new TypedFormControl<string>(),
        predicate: new TypedFormControl<string>(),
        subject: new TypedFormControl<string>(),
        graph: new TypedFormControl<string>()
      })
    ];
    const fg = new TypedFormGroup<TestDetailForm['dataContent']>({
      rows: new TypedFormArray<DataSpec>(controls),
      prefixes: new TypedFormControl<string>()
    });

    const controlContainerMock = getService(ControlContainer);
    Object.defineProperty(controlContainerMock, 'control', { value: fg });

    fixture.detectChanges(); // ngOnInit
    expect(component.removeDataRow.bind(component, -1)).not.toThrow();
    expect(component.removeDataRow.bind(component, 2)).not.toThrow();
  });
});
