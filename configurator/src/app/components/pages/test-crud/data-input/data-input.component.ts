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

  /**
   * Label getter
   */
  get title(): string {
    if (this.withExpectedResults) {
      return 'Sample dataset with expected results';
    } else if (this.onlyExpectedResults) {
      return 'Expected results';
    }

    return 'Sample dataset';
  }

  /**
   * Rows getter
   */
  get rows(): TypedFormGroup<DataSpec>[] {
    return this.formGroup?.controls.rows.controls || [];
  }


  constructor(private controlContainer: ControlContainer) {
  }

  ngOnInit(): void {
    // initialize form group here because input are bind when just before this hook fires
    this.formGroup = <TypedFormGroup<TestDetailForm['dataContent']>>(this.controlContainer.control);
  }

  /**
   * Adds a row to the table updating the form array accordingly
   */
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

  /**
   * Removes a row from the table updating the form array accordingly
   */
  removeDataRow(i: number): void {
    const formArray = this.formGroup?.controls.rows;

    if (!formArray) {
      return;
    }

    formArray.removeAt(i);
  }
}
