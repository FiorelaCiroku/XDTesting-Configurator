import { AbstractControlOptions, AsyncValidatorFn, FormArray, ValidatorFn } from '@angular/forms';
import { TypedAbstractControl, ControlResetObject, ControlResetValue, TypedControl } from '../../models/typed-form';
import { Observable } from 'rxjs';

export class TypedFormArray<T = never> extends FormArray implements TypedAbstractControl<T[]> {

  override readonly value!: T | null;
  override readonly valueChanges!: Observable<T | null | undefined>;

  constructor(override controls: TypedControl<T>[],
              validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
              asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null) {
    super(controls, validatorOrOpts, asyncValidator);
  }

  override at(index: number): TypedAbstractControl<T> {
    return super.at(index);
  }

  override push(control: TypedControl<T>, options?: { emitEvent?: boolean; }): void {
    super.push(control, options);
  }

  override insert(index: number, control: TypedAbstractControl<T>, options?: { emitEvent?: boolean; }): void {
    super.insert(index, control, options);
  }

  override setControl(index: number, control: TypedAbstractControl<T>, options?: { emitEvent?: boolean; }): void {
    super.setControl(index, control, options);
  }

  override setValue(value: Array<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.setValue(value, options);
  }

  override patchValue(value: Array<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.patchValue(value, options);
  }

  override reset(value?: ControlResetObject<T>[] | ControlResetValue<T>[], options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.reset(value, options);
  }

  override getRawValue(): T[] {
    return super.getRawValue();
  }

}
