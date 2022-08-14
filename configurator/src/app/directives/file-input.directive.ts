import { Directive, forwardRef, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Adds support for file input in reactive forms
 */
@Directive({
  selector: '[configFileInput]',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FileInputDirective),
    multi: true
  }]
})
export class FileInputDirective implements ControlValueAccessor {

  /* eslint-disable @typescript-eslint/ban-types */

  private _onModelChange?: Function;
  private _onModelTouched?: Function;

  constructor() {//
  }

  /**
   * Passes `FileList` to registered `onChange` function, in order to update the model with the provided value
   * @param files FileList from input element
   */
  @HostListener('change', ['$event.target.files'])
  updateModel(files: FileList): void {
    if (this._onModelChange) {
      this._onModelChange(files);
    }
  }

  /**
   * Signals that the input has been touched
   */
  @HostListener('blur')
  onBlur(): void {
    if (this._onModelTouched) {
      this._onModelTouched();
    }
  }


  registerOnChange(fn: Function): void {
    this._onModelChange = fn;
  }

  registerOnTouched(fn: Function): void {
    this._onModelTouched = fn;
  }

  writeValue(/*obj: FileList*/): void {
    // this._renderer2.setValue(this._hostEl.nativeElement, '');
  }

}
