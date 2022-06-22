import { Injectable } from '@angular/core';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { catchError, EMPTY, finalize, Observable, throwError } from 'rxjs';
import { AuthenticationService } from './authentication.service';
import { Router } from '@angular/router';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class HttpInterceptorService implements HttpInterceptor {

  constructor(private authService: AuthenticationService, private apiService: ApiService, private router: Router) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // adding withCredential: true ensures that the cookies are sent also for cross-site requests
    req = req.clone({
      withCredentials: true
    });

    const reqUrl = req.url;

    // set loading
    this._setLoading(reqUrl, true);


    return next.handle(req)
      .pipe(finalize(() => {
        // when original observable completes, loading will be set to false
        // see https://rxjs.dev/api/operators/finalize
        this._setLoading(reqUrl, false);
      }))
      .pipe(catchError((err: HttpErrorResponse) => {
        // if unauthorized, set $isAuthenticated to false, redirect to login page and stop
        // any other requests returning EMPTY
        if (err.status === 401) {
          this._setLoading(reqUrl, false);
          this.authService.$isAuthenticated.next(false);
          this.router.navigate([this.authService.loginUrl.toString()]);
          return EMPTY;
        }

        // make any other error bubble to source observable and let to it the handling
        return throwError(() => err);
      }));
  }

  private _setLoading(reqUrl: string, loading: boolean): void {
    // set loading only if the app is not checking if user is authenticated
    if (!reqUrl.endsWith('is-auth')) {
      this.apiService.$loading.next(loading);
    }
  }
}
