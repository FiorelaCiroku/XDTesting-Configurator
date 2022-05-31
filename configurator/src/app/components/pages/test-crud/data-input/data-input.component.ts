import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { TypedFormArray, TypedFormControl, TypedFormGroup } from '../../../../utils/typed-form';
import { DataSpec, TestDetailForm } from '../../../../models';

@Component({
  selector: 'config-data-input',
  templateUrl: './data-input.component.html',
  styleUrls: ['./data-input.component.scss']
})
export class DataInputComponent implements OnInit {

  @Input() withExpectedResults = true;
  @Input() onlyExpectedResults = false;

  formGroup?: TypedFormGroup<TestDetailForm['dataContent']>;

  get title(): string {
    if (this.withExpectedResults) {
      return 'Sample dataset with expected results';
    } else if (this.onlyExpectedResults) {
      return 'Expected results';
    }

    return 'Sample dataset';
  }

  get rows(): TypedFormGroup<DataSpec>[] {
    return this.formGroup?.controls.rows.controls || [];
  }


  constructor(private controlContainer: ControlContainer) {
  }

  ngOnInit(): void {
    this.formGroup = <TypedFormGroup<TestDetailForm['dataContent']>>(this.controlContainer.control);
  }

  addDataRow(): void {
    const formArray: TypedFormArray<DataSpec> | undefined = this.formGroup?.controls.rows;

    if (!formArray) {
      return;
    }

    const formGroup = new TypedFormGroup<DataSpec>({
      expectedResult: new TypedFormControl<boolean>(this.onlyExpectedResults),
      subject: new TypedFormControl<string>(''),
      object: new TypedFormControl<string>(''),
      predicate: new TypedFormControl<string>(''),
      graph: new TypedFormControl<string | undefined>()
    });

    formArray.push(formGroup);
  }

  removeDataRow(i: number): void {
    const formArray = this.formGroup?.controls.rows;

    if (!formArray) {
      return;
    }

    formArray.removeAt(i);
  }
}
