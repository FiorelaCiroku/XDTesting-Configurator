import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

/**
 * Returns true if the value is not null and not undefined
 * @param val any value to test
 * @returns {boolean} Whether if `val` is actually of type T
 */
export function filterNullUndefined<T>(val?: T | null): val is T {
  return val !== null && val !== undefined;
}

/**
 * Determine if passed `AbstractControl` is a `FormGroup` by checking if has the property `controls`
 * and if it is not an array (checks against `length`)
 * @param {AbstractControl} fg
 * @returns Whether passed `fg` is a `FormGroup`, or a subclass, or not
 */
export function isFormGroup<T extends FormGroup>(fg: AbstractControl): fg is T {
  return 'controls' in fg &&
    filterNullUndefined(fg) &&
    !Object.getOwnPropertyNames((fg as FormGroup | FormArray).controls).includes('length');
}

/**
 * Determine if passed `AbstractControl` is a `FormArray` by checking if has the property `controls`
 * and if it is an array (checks against `length`)
 * @param {AbstractControl} fg
 * @returns Whether passed `fg` is a `FormGroup`, or a subclass, or not
 */
export function isFormArray<T extends FormArray>(fa: AbstractControl): fa is T {
  return 'controls' in fa &&
    filterNullUndefined(fa) &&
    Object.getOwnPropertyNames((fa as FormGroup | FormArray).controls).includes('length');
}

/**
 * Helper to recursively mark all controls in a FormGroup as dirty or touched
 * @param {AbstractControl} fg FormGroup to elaborate
 * @param {boolean} touched if to mark controls as touched or, else, as dirty
 */
export function markAllAsTouchedOrDirty(fg: AbstractControl, touched?: boolean): void {
  if (isFormGroup(fg) || isFormArray(fg)) {
    const controls = isFormGroup(fg) ? Object.values(fg.controls) : fg.controls;

    for (const control of controls) {
      if (isFormArray(control) || isFormGroup(control)) {
        markAllAsTouchedOrDirty(control, touched);
      } else {
        if (touched) {
          control.markAsTouched();
        } else {
          control.markAsDirty();
        }
      }
    }

    return;
  }


  if (touched) {
    fg.markAsTouched();
  } else {
    fg.markAsDirty();
  }
}
