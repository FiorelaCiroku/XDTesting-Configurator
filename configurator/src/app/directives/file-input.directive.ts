import { Directive, ElementRef, forwardRef, HostListener, Renderer2 } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

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

  constructor(private _hostEl: ElementRef<HTMLInputElement>, private _renderer2: Renderer2) { }

  @HostListener('change', ['$event.target.files'])
  updateModel(files: FileList): void {
    if (this._onModelChange) {
      this._onModelChange(files);
    }
  }

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
