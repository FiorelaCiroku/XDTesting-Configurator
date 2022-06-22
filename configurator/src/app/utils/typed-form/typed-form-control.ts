import { AsyncValidatorFn, FormControl, FormControlOptions, ValidatorFn } from '@angular/forms';
import { TypedAbstractControl } from '../../models/typed-form';
import { Observable } from 'rxjs';

/**
 * Extends FormControl to add typings
 * @inheritdoc
 */
export class TypedFormControl<T = never> extends FormControl implements TypedAbstractControl<T> {

  override readonly defaultValue!: T | null;
  override readonly value!: T | null;
  override readonly valueChanges!: Observable<T | null | undefined>;


  constructor(formState?: T | null,
              validatorOrOpts?: ValidatorFn | ValidatorFn[] | FormControlOptions | null,
              asyncValidator?: AsyncValidatorFn | AsyncValidatorFn[] | null)
  {
    super(formState, validatorOrOpts, asyncValidator);
  }


  override setValue(value: T | null, options?: { onlySelf?: boolean; emitEvent?: boolean; emitModelToViewChange?: boolean; emitViewToModelChange?: boolean; }): void {
    super.setValue(value, options);
  }

  override patchValue(value: T | null, options?: { onlySelf?: boolean; emitEvent?: boolean; emitModelToViewChange?: boolean; emitViewToModelChange?: boolean; }): void {
    super.patchValue(value, options);
  }

  override reset(formState?: T | null, options?: { onlySelf?: boolean; emitEvent?: boolean; }): void {
    super.reset(formState, options);
  }
}
