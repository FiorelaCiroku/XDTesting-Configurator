import { HttpClient } from '@angular/common/http';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { AuthenticationService } from './authentication.service';


const httpClientMock = {} as HttpClient;
const routerMock = {
  parseUrl: (url: string): UrlTree => new UrlTree()
} as Router;
const providers: Provider[] = [
  { provide: HttpClient, useValue: httpClientMock },
  { provide: Router, useValue: routerMock }
];

describe('AuthenticationService', () => {
  let service: AuthenticationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers
    });
    service = TestBed.inject(AuthenticationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
