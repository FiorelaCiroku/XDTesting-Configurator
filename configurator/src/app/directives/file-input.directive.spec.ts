import { Component, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { FileInputDirective } from './file-input.directive';

@Component({ template: '<input type="file" configFileInput #testInput />' })
class FakeComponent {
  @ViewChild('testInput', { read: FileInputDirective }) fileDirective!: FileInputDirective;
  @ViewChild('testInput', { read: NG_VALUE_ACCESSOR }) ngValueAccessor!: any[];
}


describe('FileInputDirective', () => {
  it('should create an instance', () => {
    const directive = new FileInputDirective();
    expect(directive).toBeTruthy();
  });

  it('should react to blur event', async () => {
    const onModelTouchedCbSpy = jasmine.createSpy('onModelTouched');
    const onBlurSpy = spyOn(FileInputDirective.prototype, 'onBlur').and.callThrough();

    await TestBed.configureTestingModule({
      declarations: [
        FileInputDirective,
        FakeComponent
      ]
    })
      .compileComponents();

    const fixture = TestBed.createComponent(FakeComponent);
    const input = fixture.debugElement.queryAll(By.directive(FileInputDirective));

    fixture.detectChanges();

    const directive = fixture.componentInstance.fileDirective;

    directive['_onModelTouched'] = onModelTouchedCbSpy;
    input[0].triggerEventHandler('blur', undefined);

    expect(onBlurSpy).toHaveBeenCalled();
    expect(onModelTouchedCbSpy).toHaveBeenCalled();
  });

  it('should react to change event', async () => {
    const onModelChangeCbSpy = jasmine.createSpy('onModelChange');
    const updateModelSpy = spyOn(FileInputDirective.prototype, 'updateModel').and.callThrough();

    await TestBed.configureTestingModule({
      declarations: [
        FileInputDirective,
        FakeComponent
      ]
    })
      .compileComponents();

    const fixture = TestBed.createComponent(FakeComponent);
    const input = fixture.debugElement.queryAll(By.directive(FileInputDirective));

    fixture.detectChanges();

    // see https://stackoverflow.com/a/68182158/7432968
    const dataTransfer = new DataTransfer();
    const directive = fixture.componentInstance.fileDirective;

    directive['_onModelChange'] = onModelChangeCbSpy;
    dataTransfer.items.add(new File([], ''));
    input[0].nativeElement.files = dataTransfer.files;
    input[0].triggerEventHandler('change', { target: input[0].nativeElement });

    expect(updateModelSpy).toHaveBeenCalled();
    expect(onModelChangeCbSpy).toHaveBeenCalledWith(dataTransfer.files);
  });

  it('should register on change callback', () => {
    const directive = new FileInputDirective();
    const onChange = (): void => { /* */ };
    directive.registerOnChange(onChange);

    expect(directive['_onModelTouched']).not.toBeDefined();
    expect(directive['_onModelChange']).toBe(onChange);
  });

  it('should register on touched callback', () => {
    const directive = new FileInputDirective();
    const onTouched = (): void => { /* */ };
    directive.registerOnTouched(onTouched);

    expect(directive['_onModelChange']).not.toBeDefined();
    expect(directive['_onModelTouched']).toBe(onTouched);
  });

  it('should write value', () => {
    const directive = new FileInputDirective();
    expect(directive.writeValue.bind(directive)).not.toThrow();
  });

  it('should return directive', async () => {
    await TestBed.configureTestingModule({
      declarations: [
        FileInputDirective,
        FakeComponent
      ]
    })
      .compileComponents();

    const fixture = TestBed.createComponent(FakeComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.ngValueAccessor instanceof FileInputDirective).toBeTrue();
  });
});
