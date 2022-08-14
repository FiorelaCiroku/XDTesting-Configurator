import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { LoginAuthParams } from 'src/app/models';
import { LoginComponent } from './login.component';


async function initialize(httpClientMock?: Partial<HttpClient> | null, activatedRouteMock?: Partial<ActivatedRoute> | null, routerMock?: Partial<Router> | null): Promise<{ component: LoginComponent; fixture: ComponentFixture<LoginComponent> }> {
  activatedRouteMock = {
    queryParams: of({}),
    ...(activatedRouteMock ?? {})
  };

  await TestBed.configureTestingModule({
    declarations: [ LoginComponent ],
    providers: [
      { provide: HttpClient, useValue: httpClientMock },
      { provide: ActivatedRoute, useValue: activatedRouteMock},
      { provide: Router, useValue: routerMock }
    ],
    schemas: [NO_ERRORS_SCHEMA]
  })
  .compileComponents();

  const fixture = TestBed.createComponent(LoginComponent);
  const component = fixture.componentInstance;
  fixture.detectChanges();

  return { fixture, component };
}


describe('LoginComponent', () => {
  it('should create', async () => {
    const {component} = await initialize();
    expect(component).toBeTruthy();
  });

  it('should stop query parameters processing', async () => {
    async function theoryTestCase(path?: string, params?: LoginAuthParams): Promise<void> {
      const httpClientMock: Partial<HttpClient> = {
        get: jasmine.createSpy('get').and.returnValue(of())
      };

      const {fixture, component} = await initialize(httpClientMock, { routeConfig: { path }, queryParams: params ? of(params) : undefined });

      expect(component).toBeTruthy();
      expect(httpClientMock.get).not.toHaveBeenCalled();

      await fixture.whenStable();
    }

    const args: Parameters<typeof theoryTestCase>[] = [
      [undefined, undefined],
      ['other', undefined],
      ['auth', undefined],
      ['auth', {}],
      ['auth', { other: '123' }],
    ];

    await Promise.all(args.map( ([path, params]) => theoryTestCase(path, params) ));
  });

  it('should process query parameters', async () => {
    // use subject to pause execution of observable and spy on intermediate properties
    const getSubject$ = new Subject<void>();
    const httpClientMock: Partial<HttpClient> = {
      get: jasmine.createSpy('get').and.returnValue(getSubject$.asObservable())
    };
    const routerMock: Partial<Router> = {
      navigate: jasmine.createSpy('navigate').and.returnValue(of(null))
    };

    const {fixture, component} = await initialize(
      httpClientMock,
      {
        routeConfig: {
          path: 'auth'
        },
        queryParams: of({ code: '123' })
      },
      routerMock
    );

    expect(component).toBeTruthy();

    await fixture.whenStable();

    expect(component.authenticating).toBeTrue();

    getSubject$.next();
    getSubject$.complete();

    await fixture.whenStable();

    expect(httpClientMock.get).toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalled();
    expect(component.authenticating).toBeFalse();
  });

  it('should show http error messages', async () => {
    // use subject to pause execution of observable and spy on intermediate properties
    const getSubject$ = new Subject<void>();
    const routerMock: Partial<Router> = {
      navigate: jasmine.createSpy('navigate')
    };
    const httpClientMock: Partial<HttpClient> = {
      get: jasmine.createSpy('get').and.returnValue(getSubject$.asObservable())
    };

    const {fixture, component} = await initialize(
      httpClientMock,
      {
        routeConfig: {
          path: 'auth'
        },
        queryParams: of({ code: '123' })
      }
    );

    expect(component).toBeTruthy();

    await fixture.whenStable();

    expect(component.authenticating).toBeTrue();

    getSubject$.error(new HttpErrorResponse({ error: 'some error' }));
    getSubject$.complete();

    await fixture.whenStable();

    expect(httpClientMock.get).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
    expect(component.authenticating).toBeFalse();
    expect(component.error).toBeTruthy();
  });
});
