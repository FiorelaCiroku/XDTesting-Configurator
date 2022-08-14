import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AlertComponent } from './alert.component';


describe('AlertComponent', () => {
  let component: AlertComponent;
  let fixture: ComponentFixture<AlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update two-way binding variable', () => {
    const openChangeSpy = spyOn(component.isOpenChange, 'emit').and.callThrough();

    fixture.detectChanges(); // trigger ngOnInit;
    component.close();

    expect(component.isOpen).toBeFalse();
    expect(openChangeSpy).toHaveBeenCalledWith(false);
  });

  it('should not render html', () => {
    component.isOpen = false;
    fixture.detectChanges();

    const element = fixture.debugElement.query(By.css('.alert'))?.nativeElement;
    expect(element).toBeFalsy();
  });
});
