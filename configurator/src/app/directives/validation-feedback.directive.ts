import { Directive, DoCheck, ElementRef, Input, Renderer2 } from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';

/**
 * Displays validation feedback in HTML
 */
@Directive({
  selector: '[configValidationFeedback]'
})
export class ValidationFeedbackDirective implements DoCheck {

  @Input() invalidMessages: { [key: string]: string } = {required: 'Field is required'};
  @Input() validMessages: string[] = [];

  private _lastStatus?: 'VALID' | 'INVALID';


  constructor(private _ngControl: NgControl, private _renderer2: Renderer2, private _hostEl?: ElementRef<HTMLInputElement>) {
  }


  ngDoCheck(): void {
    // get HTML element
    const element = this._hostEl?.nativeElement;

    // get registered control
    const control = this._ngControl.control;

    // if control has not been registered, the element is not present in DOM, is disabled or has not been touched yet just stop the processing
    if (!control || !control.touched || control.pristine || !element || control.disabled) {
      return;
    }

    // handles the current status checking for the previous one
    // if the current status is equal tho the previous, no actions have to be taken
    if (control.valid) {
      if (this._lastStatus !== 'VALID') {
        this._handleValid(element);
      }

    } else {
      if (this._lastStatus !== 'INVALID') {
        this._handleInvalid(element, control);
      }
    }
  }

  private _handleValid(controlElement: HTMLElement): void {
    // set current status
    this._lastStatus = 'VALID';

    // remove invalid classes and valid one
    this._renderer2.removeClass(controlElement, 'is-invalid');
    this._renderer2.addClass(controlElement, 'is-valid');


    // remove invalid feedback
    let element: Element = controlElement;
    let sibling = element.nextElementSibling;

    while (sibling !== null) {
      if (sibling.classList.contains('invalid-feedback')) {
        sibling.remove();
      } else {
        element = sibling;
      }

      sibling = element.nextElementSibling;
    }

    // add valid feedback
    for (const message of this.validMessages) {
      // create element
      const feedback = document.createElement('small');

      // add text and class
      feedback.innerText = message;
      feedback.classList.add('valid-feedback');

      // insert element after input
      controlElement.insertAdjacentElement('afterend', feedback);
    }
  }

  private _handleInvalid(controlElement: HTMLElement, control: AbstractControl): void {
    // set current status
    this._lastStatus = 'INVALID';

    // remove invalid classes and valid one
    this._renderer2.removeClass(controlElement, 'is-valid');
    this._renderer2.addClass(controlElement, 'is-invalid');

    // remove valid feedback
    let element: Element = controlElement;
    let sibling = element.nextElementSibling;

    while (sibling !== null) {
      if (sibling.classList.contains('valid-feedback')) {
        sibling.remove();
      } else {
        element = sibling;
      }

      sibling = element.nextElementSibling;
    }

    // get errors from control
    const errors = Object.keys(control.errors || {});

    // add invalid feedbacks
    for (const error of errors) {
      // check is feedback message is defined
      if (! this.invalidMessages[error]) {
        continue;
      }

      // get feedback message
      const message = this.invalidMessages[error];

      // create element
      const feedback = document.createElement('small');

      // add text and class
      feedback.innerText = message;
      feedback.classList.add('invalid-feedback');

      // insert element after input
      controlElement.insertAdjacentElement('afterend', feedback);
    }
  }
}
