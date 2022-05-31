import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer } from '@angular/forms';
import { TypedFormControl, TypedFormGroup } from '../../../../utils/typed-form';
import { DataSpec, TestDetailForm } from '../../../../models';

@Component({
  selector: 'config-data-input',
  templateUrl: './data-input.component.html',
  styleUrls: ['./data-input.component.scss']
})
export class DataInputComponent implements OnInit {

  @Input() withExpectedResults = true;

  formGroup?: TypedFormGroup<TestDetailForm['dataContent']>;
  get rows(): TypedFormGroup<DataSpec>[] {
    return this.formGroup?.controls.rows.controls || [];
  }

  constructor(private controlContainer: ControlContainer) {
  }

  ngOnInit(): void {
    this.formGroup = <TypedFormGroup<TestDetailForm['dataContent']>>(this.controlContainer.control);
  }

  addDataRow(): void {
    const formArray = this.formGroup?.controls.rows.controls;

    if (!formArray) {
      return;
    }

    const formGroup = new TypedFormGroup<DataSpec>({
      expectedResult: new TypedFormControl<boolean>(false),
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
