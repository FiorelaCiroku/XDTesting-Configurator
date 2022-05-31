import { AbstractControl } from '@angular/forms';
import { TypedFormArray, TypedFormGroup } from '../../utils/typed-form';


export type TypedControl<T> = T extends Record<string, unknown> ?
                              TypedFormGroup<T> :
                              (
                                T extends (infer U)[] ?
                                TypedFormArray<U> :
                                (
                                  T extends null | undefined ?
                                  never :
                                  TypedAbstractControl<T extends boolean ? boolean : T>
                                )
                              );


export interface TypedAbstractControl<T = never> extends AbstractControl {
  setValue(value: T, options?: unknown): void;
  patchValue(value: T, options?: unknown): void;
  reset(value?: T, options?: unknown): void;
}
