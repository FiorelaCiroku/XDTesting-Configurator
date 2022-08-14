import { ElementRef, Renderer2 } from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';
import { ValidationFeedbackDirective } from './validation-feedback.directive';

function initialize(ngControlMock?: Partial<NgControl>, renderer2Mock?: Partial<Renderer2>, elRefMock?: Partial<ElementRef<HTMLInputElement>>): ValidationFeedbackDirective {
  ngControlMock ??= {};
  renderer2Mock ??= {
    removeClass(el: Element, cl: string): void {
      el.classList.remove(cl);
    },
    addClass(el:Element, cl: string): void {
      el.classList.add(cl);
    }
  };

  return new ValidationFeedbackDirective(
    ngControlMock as NgControl,
    renderer2Mock as Renderer2,
    elRefMock as ElementRef<HTMLInputElement> | undefined,
  );
}

describe('ValidationFeedbackDirective', () => {
  it('should create an instance', () => {
    const directive = initialize();
    expect(directive).toBeTruthy();
  });

  it('should not handle input status', () => {
    const defaultValidElementRefMock: Partial<ElementRef<HTMLInputElement>> = {
      nativeElement: document.createElement('input')
    };

    const test = (ngControlMock: Partial<NgControl>, elRefMock?: Partial<ElementRef<HTMLInputElement>>, lastStatus?: 'VALID' | 'INVALID'): void => {
      const directive = initialize(ngControlMock, undefined, elRefMock);
      const handleValidSpy = spyOn<any>(directive, '_handleValid');
      const handleInvalidSpy = spyOn<any>(directive, '_handleInvalid');

      directive['_lastStatus'] = lastStatus;
      directive.ngDoCheck();

      expect(handleValidSpy).not.toHaveBeenCalled();
      expect(handleInvalidSpy).not.toHaveBeenCalled();
    };

    const args: Parameters<typeof test>[] = [
      [{ control: <AbstractControl>{touched: true} }, undefined], // 'touched: true' to make ngDoCheck check for 'element'
      [{ control: <AbstractControl>{touched: true} }, {}], // 'touched: true' to make ngDoCheck check for 'element'
      [{}, defaultValidElementRefMock],
      [{ control: <AbstractControl>{} }, defaultValidElementRefMock],
      [{ control: <AbstractControl>{touched: true, pristine: true} }, defaultValidElementRefMock],
      [{ control: <AbstractControl>{touched: true, pristine: false, disabled: true} }, defaultValidElementRefMock],
      [{ control: <AbstractControl>{touched: true, valid: false} }, defaultValidElementRefMock, 'INVALID'],
      [{ control: <AbstractControl>{touched: true, valid: true} }, defaultValidElementRefMock,  'VALID']
    ];

    args.map(([ngControlMock, elRefMock, lastStatus]) => test(ngControlMock, elRefMock, lastStatus));
  });

  it('should handle valid status', () => {
    const wrapperElement = document.createElement('div');
    const nativeElement = document.createElement('input');
    const siblings: Element[] = [
      document.createElement('div'),
      document.createElement('div')
    ];

    const directive = initialize(
      { control: <AbstractControl>{touched: true, valid: true} },
      undefined,
      { nativeElement }
    );

    wrapperElement.appendChild(nativeElement);
    siblings[0].classList.add('valid-feedback');
    siblings[1].classList.add('invalid-feedback');
    nativeElement.insertAdjacentElement('afterend', siblings[0]);
    siblings[0].insertAdjacentElement('afterend', siblings[1]);

    // resulting HTML in wrapper will be:
    // <div>
    //   <input>
    //   <div class="valid-feedback"></div>
    //   <div class="invalid-feedback"></div>
    // </div>


    spyOn(nativeElement, 'insertAdjacentElement').and.callFake((where: InsertPosition, element: Element): Element => {
      expect(where).toEqual('afterend');
      expect(element.tagName.toLowerCase()).toEqual('small');
      expect(element.classList).toContain('valid-feedback');
      expect(element.classList).not.toContain('invalid-feedback');
      return nativeElement;
    });

    const removeSpies: jasmine.Spy[] = [];

    for (const sibling of siblings) {
      removeSpies.push(spyOn(sibling, 'remove').and.callThrough());
    }

    directive.validMessages = ['Field is valid'];
    directive.ngDoCheck();

    expect(removeSpies[0]).not.toHaveBeenCalled();
    expect(removeSpies[1]).toHaveBeenCalled();
    expect(nativeElement.classList).toContain('is-valid');
    expect(nativeElement.classList).not.toContain('is-invalid');
  });

  it('should handle invalid status', () => {
    const wrapperElement = document.createElement('div');
    const nativeElement = document.createElement('input');
    const siblings: Element[] = [
      document.createElement('div'),
      document.createElement('div')
    ];

    const directive = initialize(
      {
        control: jasmine.createSpyObj<AbstractControl>([], {
          touched: true,
          valid: false,
          errors: {required: true, someOtherError: true}
        })
      },
      undefined,
      { nativeElement }
    );

    wrapperElement.appendChild(nativeElement);
    siblings[0].classList.add('valid-feedback');
    siblings[1].classList.add('invalid-feedback');
    nativeElement.insertAdjacentElement('afterend', siblings[1]);
    siblings[1].insertAdjacentElement('afterend', siblings[0]);

    // resulting HTML in wrapper will be:
    // <div>
    //   <input>
    //   <div class="invalid-feedback"></div>
    //   <div class="valid-feedback"></div>
    // </div>


    spyOn(nativeElement, 'insertAdjacentElement').and.callFake((where: InsertPosition, element: Element): Element => {
      expect(where).toEqual('afterend');
      expect(element.tagName.toLowerCase()).toEqual('small');
      expect(element.classList).toContain('invalid-feedback');
      expect(element.classList).not.toContain('valid-feedback');
      expect(element.innerHTML).toEqual('Field is required');
      return nativeElement;
    });

    const removeSpies: jasmine.Spy[] = [];

    for (const sibling of siblings) {
      removeSpies.push(spyOn(sibling, 'remove').and.callThrough());
    }

    directive.ngDoCheck();

    expect(removeSpies[1]).not.toHaveBeenCalled();
    expect(removeSpies[0]).toHaveBeenCalled();
    expect(nativeElement.classList).toContain('is-invalid');
    expect(nativeElement.classList).not.toContain('is-valid');
  });

  it('should handle invalid status without errors', () => {
    const nativeElement = document.createElement('input');
    const directive = initialize(
      {
        control: jasmine.createSpyObj<AbstractControl>([], {
          touched: true,
          valid: false
        })
      },
      undefined,
      { nativeElement }
    );


    const insertSpy = spyOn(nativeElement, 'insertAdjacentElement');

    expect(directive.ngDoCheck.bind(directive)).not.toThrow();
    expect(nativeElement.classList).toContain('is-invalid');
    expect(nativeElement.classList).not.toContain('is-valid');
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
