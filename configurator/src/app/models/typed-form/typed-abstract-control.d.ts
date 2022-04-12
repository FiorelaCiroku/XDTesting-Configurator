import { AbstractControl } from '@angular/forms';

export interface TypedAbstractControl<T = never> extends AbstractControl {
  setValue(value: T, options?: unknown): void;
  patchValue(value: T, options?: unknown): void;
  reset(value?: T, options?: unknown): void;
}
