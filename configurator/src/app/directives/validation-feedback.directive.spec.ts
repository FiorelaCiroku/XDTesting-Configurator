import { ElementRef, Renderer2 } from '@angular/core';
import { NgControl } from '@angular/forms';
import { ValidationFeedbackDirective } from './validation-feedback.directive';


const ngControlMock = {} as NgControl;
const renderer2Mock = {} as Renderer2;
const elRefMock = {} as ElementRef<HTMLInputElement>;

describe('ValidationFeedbackDirective', () => {
  it('should create an instance', () => {
    const directive = new ValidationFeedbackDirective(ngControlMock, elRefMock, renderer2Mock);
    expect(directive).toBeTruthy();
  });
});
