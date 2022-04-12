import {
  AfterContentInit,
  Component,
  ContentChild,
  DoCheck,
  ElementRef,
  Input,
  OnDestroy,
  Renderer2
} from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: '[validationFeedback]',
  templateUrl: './validation-feedback.directive.html',
  styleUrls: ['./validation-feedback.directive.scss']
})
export class ValidationFeedbackDirective implements AfterContentInit, OnDestroy, DoCheck {

  @Input() invalidClasses: string[] = ['is-invalid'];
  @Input() validClasses: string[] = ['is-valid'];
  @Input() invalidMessages: { [key: string]: string } = {required: 'Field is required'};
  @Input() validMessages: string[] = [];

  @ContentChild(NgControl) ngControl?: NgControl;
  @ContentChild(NgControl, {read: ElementRef}) element?: ElementRef;

  control?: AbstractControl;

  private _sub?: Subscription;


  constructor(private renderer2: Renderer2) {
  }


  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  ngAfterContentInit(): void {
    const control = this.ngControl?.control;
    const element = this.element?.nativeElement as HTMLElement;

    if (!control || !element) {
      return;
    }

    this.control = control;
  }

  ngDoCheck(): void {
    const element = this.element?.nativeElement;
    const control = this.control;

    if (!control || !control.touched || control.pristine || !element || control.disabled) {
      return;
    }

    if (control.valid) {
      for (const invalidClass of this.invalidClasses) {
        this.renderer2.removeClass(element, invalidClass);
      }

      for (const validClass of this.validClasses) {
        this.renderer2.addClass(element, validClass);
      }

    } else {
      for (const [k,v] of Object.entries(control.parent?.controls || {})) {
        console.log(k, v.valid, v.errors);
      }
      for (const validClass of this.validClasses) {
        this.renderer2.removeClass(element, validClass);
      }

      for (const invalidClass of this.invalidClasses) {
        this.renderer2.addClass(element, invalidClass);
      }
    }
  }
}
