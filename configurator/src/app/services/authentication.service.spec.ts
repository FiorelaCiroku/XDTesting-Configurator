import { HttpClient } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthenticationService } from './authentication.service';


function initialize(httpClientMock?: Partial<HttpClient>, routerMock?: Partial<Router>): AuthenticationService {
  httpClientMock ??= {};
  routerMock ??= {
    parseUrl(): UrlTree { return new UrlTree(); }
  };

  return new AuthenticationService(routerMock as Router, httpClientMock as HttpClient);
}

describe('AuthenticationService', () => {
  it('should be created', () => {
    const service = initialize();
    expect(service).toBeTruthy();
  });

  it('should redirect to login url of http error', fakeAsync(() => {
    const service = initialize({
      get: (): Observable<any> => throwError(() => 'Some error')
    });

    service.canActivate().subscribe((result) => {
      expect(result).toBe(service.loginUrl);
    });

    tick();
  }));

  it('should allow activation on http success', fakeAsync(() => {
    const getSpy = jasmine.createSpy('get').and.returnValue(of(null));
    const service = initialize({
      get: getSpy
    });

    service.canActivate().subscribe((result) => {
      console.log({result});
      expect(result).toBe(true);
    });

    tick();

    expect(getSpy).toHaveBeenCalled();
  }));

  it('should allow activation on isAuthenticated = true', fakeAsync(() => {
    const getSpy = jasmine.createSpy('get');
    const service = initialize({
      get: getSpy
    });

    service.isAuthenticated = true;
    service.canActivate().subscribe((result) => {
      expect(result).toBe(true);
    });

    tick();

    expect(getSpy).not.toHaveBeenCalled();
  }));
});
