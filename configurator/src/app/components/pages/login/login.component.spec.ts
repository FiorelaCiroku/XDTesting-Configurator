import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { LoginComponent } from './login.component';


const httpClientMock = {} as HttpClient;
const activatedRouteMock = {
  queryParams: of({})
} as ActivatedRoute;
const routerMock = {} as Router;
const providers: Provider[] = [
  { provide: HttpClient, useValue: httpClientMock },
  { provide: ActivatedRoute, useValue: activatedRouteMock },
  { provide: Router, useValue: routerMock }
];

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LoginComponent ],
      providers
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
