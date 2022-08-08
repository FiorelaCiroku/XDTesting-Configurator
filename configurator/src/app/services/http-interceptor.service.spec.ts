import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { AuthenticationService } from './authentication.service';
import { HttpInterceptorService } from './http-interceptor.service';


const authenticationServiceMock = {} as AuthenticationService;
const apiServiceMock = {} as ApiService;
const routerMock = {} as Router;
const providers: Provider[] = [
  { provide: AuthenticationService, useValue: authenticationServiceMock },
  { provide: ApiService, useValue: apiServiceMock },
  { provide: Router, useValue: routerMock }
];

describe('HttpInterceptorService', () => {
  let service: HttpInterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers
    });
    service = TestBed.inject(HttpInterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
