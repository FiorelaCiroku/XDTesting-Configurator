import { AbstractControl } from '@angular/forms';
import { TypedFormArray, TypedFormGroup } from '../../utils/typed-form';

/** Conditional type, see https://www.typescriptlang.org/docs/handbook/2/conditional-types.html
  *
  * Follows this logic:
  * - if `T` extends Record<string, unknown> -> `TypedControl` aliases `TypedFormGroup<T>`
  * - else if `T` is an array -> infer elements type (`U`) and `TypedControl` aliases `TypedFormArray<U>`
  * - else if `T` is a primitive type ->
  *   - make it non-null: see https://www.typescriptlang.org/docs/handbook/utility-types.html#nonnullabletype and its definition
  *   - `TypedControl` aliases `TypedAbstractControl<T>`
  */
export type TypedControl<T> = T extends Record<string, unknown> ?
                              TypedFormGroup<T> :
                              (
                                T extends (infer U)[] ?
                                TypedFormArray<U> :
                                (
                                  T extends null | undefined ?
                                  never :
                                  TypedAbstractControl<T extends boolean ? boolean : T> // patch to overcome TypeScript's type inference bug
                                )                                                       // see https://github.com/microsoft/TypeScript/issues/22630 and related
                              );


export interface TypedAbstractControl<T = never> extends AbstractControl {
  setValue(value: T, options?: unknown): void;
  patchValue(value: T, options?: unknown): void;
  reset(value?: T, options?: unknown): void;
}
