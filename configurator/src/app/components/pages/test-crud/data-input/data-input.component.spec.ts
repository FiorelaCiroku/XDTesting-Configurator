import { NO_ERRORS_SCHEMA, Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlContainer } from '@angular/forms';
import { DataInputComponent } from './data-input.component';


const controlContainerMock = {} as ControlContainer;
const providers: Provider[] = [
  { provide: ControlContainer, useValue: controlContainerMock }
];

describe('DataInputComponent', () => {
  let component: DataInputComponent;
  let fixture: ComponentFixture<DataInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataInputComponent ],
      providers,
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DataInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
