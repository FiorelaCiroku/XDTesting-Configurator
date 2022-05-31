import { AbstractControl, FormArray, FormGroup } from '@angular/forms';


export function filterNullUndefined<T>(val?: T | null): val is T {
  return val !== null && val !== undefined;
}

export function isFormGroup<T extends FormGroup>(fg: AbstractControl): fg is T {
  return 'controls' in fg &&
    filterNullUndefined(fg) &&
    !Object.getOwnPropertyNames((fg as FormGroup | FormArray).controls).includes('length');
}

export function isFormArray<T extends FormArray>(fa: AbstractControl): fa is T {
  return 'controls' in fa &&
    filterNullUndefined(fa) &&
    Object.getOwnPropertyNames((fa as FormGroup | FormArray).controls).includes('length');
}

export function markAllAsTouchedOrDirty(fg: AbstractControl, touched = false): void {
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
