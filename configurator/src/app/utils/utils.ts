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
 * Helper to recursively mark all controls in a FormGroup as dirty or touched
 * @param {AbstractControl} fg FormGroup to elaborate
 */
export function markAllAsDirty(fg: AbstractControl): void {
  if (fg instanceof FormGroup || fg instanceof FormArray) {
    const controls = fg instanceof FormGroup ? Object.values(fg.controls) : fg.controls;

    for (const control of controls) {
      markAllAsDirty(control);
    }

    return;
  }

  fg.markAsDirty();
}

/**
 * Helper to programmatically enable or disable all form group's controls
 * @param formGroup Form group on which to disable or enable controls
 */
export function toggleDisableControls(formGroup: FormGroup): void {
  if (formGroup.disabled) {
    formGroup.enable();
    return;
  }

  formGroup.disable();
}
