import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogService } from 'primeng/dynamicdialog';
import { ApiService } from 'src/app/services';
import { LayoutComponent } from './layout.component';


const apiServiceMock = {} as ApiService;
const dialogServiceMock = {} as DialogService;
const providers: Provider[] = [
  { provide: ApiService, useValue: apiServiceMock },
  { provide: DialogService, useValue: dialogServiceMock}
];


describe('LayoutComponent', () => {
  let component: LayoutComponent;
  let fixture: ComponentFixture<LayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LayoutComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
