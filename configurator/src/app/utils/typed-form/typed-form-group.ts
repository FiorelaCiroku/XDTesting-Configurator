import { AbstractControlOptions, AsyncValidatorFn, FormGroup, ValidatorFn } from '@angular/forms';
import { TypedAbstractControl, TypedFormGroupModel, ControlResetObject } from '../../models/typed-form';
import { Observable } from 'rxjs';

export class TypedFormGroup<T = never> extends FormGroup implements TypedAbstractControl<T> {

  override readonly value!: T | null;
  override readonly valueChanges!: Observable<T | null | undefined>;

  constructor(override controls: TypedFormGroupModel<T>,
              validatorOrOpts?: ValidatorFn | ValidatorFn[] | AbstractControlOptions | null,
              asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null
  ) {
    super(controls, validatorOrOpts, asyncValidator);
  }

  override registerControl(name: Extract<string, keyof T>, control: TypedAbstractControl): TypedAbstractControl {
    return super.registerControl(name, control);
  }

  override addControl(name: Extract<string, keyof T>, control: TypedAbstractControl, options?: { emitEvent?: boolean; }): void {
    super.addControl(name, control, options);
  }

  override removeControl(name: Extract<string, keyof T>, options?: { emitEvent?: boolean; }): void {
    super.removeControl(name, options);
  }

  override setControl(name: Extract<string, keyof T>, control: TypedAbstractControl, options?: { emitEvent?: boolean; }): void {
    super.setControl(name, control, options);
  }

  override contains(controlName: Extract<string, keyof T>): boolean {
    return super.contains(controlName);
  }

  override setValue(value: Partial<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.setValue(value, options);
  }

  override patchValue(value: Partial<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.patchValue(value, options);
  }

  override reset(value?: ControlResetObject<T>, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.reset(value, options);
  }

  override getRawValue(): Partial<T> {
    return super.getRawValue();
  }
}
