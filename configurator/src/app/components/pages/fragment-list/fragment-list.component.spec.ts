import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { Fragment } from 'src/app/models';
import { ApiService } from 'src/app/services';
import { FragmentListComponent } from './fragment-list.component';


const apiService = {
  getFragments: (): Observable<Fragment[]> => of([]),
} as ApiService;

const providers: Provider[] = [
  { provide: ApiService, useValue: apiService }
];


describe('FragmentListComponent', () => {
  let component: FragmentListComponent;
  let fixture: ComponentFixture<FragmentListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FragmentListComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FragmentListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
