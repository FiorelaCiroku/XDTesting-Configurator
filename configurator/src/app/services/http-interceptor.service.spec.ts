import { HttpErrorResponse, HttpEvent, HttpHandler, HttpRequest, HttpResponse } from '@angular/common/http';
import { fakeAsync, tick } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject, catchError, finalize, of, Subject } from 'rxjs';
import { ApiService } from './api.service';
import { AuthenticationService } from './authentication.service';
import { HttpInterceptorService } from './http-interceptor.service';


function initialize(authServiceMock?: Partial<AuthenticationService>, apiServiceMock?: Partial<ApiService>, routerMock?: Partial<Router>): HttpInterceptorService {
  authServiceMock ??= {};
  apiServiceMock ??= {};
  routerMock ??= {};

  return new HttpInterceptorService(
    authServiceMock as AuthenticationService,
    apiServiceMock as ApiService,
    routerMock as Router
  );
}


describe('HttpInterceptorService', () => {
  it('should be created', () => {
    const service = initialize();
    expect(service).toBeTruthy();
  });

  it('should set loading status', fakeAsync(() => {
    const apiServiceMock: Partial<ApiService> = {
      $loading: new BehaviorSubject<boolean>(false)
    };
    const service = initialize(undefined, apiServiceMock);
    const handler$ = new Subject<HttpEvent<any>>();
    const handler: HttpHandler = {
      handle(req) {
        expect(req.withCredentials).toBeTrue();
        return handler$.asObservable();
      }
    };

    const sub$ = service.intercept(new HttpRequest('GET', 'https://www.example.com'), handler)
      .pipe(finalize(() => { sub$.unsubscribe(); }))
      .subscribe();

    expect(apiServiceMock.$loading!.value).toBeTrue();

    handler$.next(new HttpResponse<never>());
    tick();
    handler$.complete();
    tick();

    expect(apiServiceMock.$loading!.value).toBeFalse();

  }));

  it('should not set loading status', fakeAsync(() => {
    const apiServiceMock: Partial<ApiService> = {
      $loading: new BehaviorSubject<boolean>(false)
    };
    const service = initialize(undefined, apiServiceMock);
    const handler$ = new Subject<HttpEvent<any>>();
    const handler: HttpHandler = {
      handle(req) {
        expect(req.withCredentials).toBeTrue();
        return handler$.asObservable();
      }
    };

    const sub$ = service.intercept(new HttpRequest('GET', 'https://www.example.com/is-auth'), handler)
      .pipe(finalize(() => { sub$.unsubscribe(); }))
      .subscribe();

    expect(apiServiceMock.$loading!.value).toBeFalse();

    handler$.next(new HttpResponse<never>());
    tick();
    handler$.complete();
    tick();

    expect(apiServiceMock.$loading!.value).toBeFalse();
  }));

  it('should redirect to login page', fakeAsync(() => {
    const routerMock: Partial<Router> = {
      navigate: jasmine.createSpy('navigate')
    };
    const apiServiceMock: Partial<ApiService> = {
      $loading: new BehaviorSubject<boolean>(false)
    };

    const authServiceMock: Partial<AuthenticationService> = {
      loginUrl: {
        toString() {
          return 'url';
        }
      } as UrlTree,
      isAuthenticated: true
    };

    const service = initialize(authServiceMock, apiServiceMock, routerMock);
    const handler$ = new Subject<HttpEvent<any>>();
    const handler: HttpHandler = {
      handle(req) {
        expect(req.withCredentials).toBeTrue();
        return handler$.asObservable();
      }
    };

    const sub$ = service.intercept(new HttpRequest('GET', 'https://www.example.com'), handler)
      .pipe(finalize(() => { sub$.unsubscribe(); }))
      .subscribe();

    expect(apiServiceMock.$loading!.value).toBeTrue();

    handler$.error(new HttpErrorResponse({ status: 401 }));
    tick();
    handler$.complete();
    tick();

    expect(apiServiceMock.$loading!.value).toBeFalse();
    expect(authServiceMock.isAuthenticated).toBeFalse();
    expect(routerMock.navigate).toHaveBeenCalledWith([authServiceMock.loginUrl!.toString()]);
  }));

  it('should redirect to login page', fakeAsync(() => {
    const apiServiceMock: Partial<ApiService> = {
      $loading: new BehaviorSubject<boolean>(false)
    };

    const service = initialize(undefined, apiServiceMock);
    const handler$ = new Subject<HttpEvent<any>>();
    const handler: HttpHandler = {
      handle(req) {
        expect(req.withCredentials).toBeTrue();
        return handler$.asObservable();
      }
    };

    const error = new HttpErrorResponse({ status: 400 });
    const errorHandler = jasmine.createSpy('errorHandler').and.callFake((err) => {
      expect(err).toBe(error);
      return of(undefined);
    });

    const sub$ = service.intercept(new HttpRequest('GET', 'https://www.example.com'), handler)
      .pipe(finalize(() => { sub$.unsubscribe(); }))
      .pipe(catchError(errorHandler))
      .subscribe();

    expect(apiServiceMock.$loading!.value).toBeTrue();

    handler$.error(error);
    tick();
    handler$.complete();
    tick();

    expect(apiServiceMock.$loading!.value).toBeFalse();
    expect(errorHandler).toHaveBeenCalled();
  }));
});
