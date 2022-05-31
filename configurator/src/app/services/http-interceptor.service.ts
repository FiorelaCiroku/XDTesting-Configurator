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

  constructor(private authservice: AuthenticationService, private apiService: ApiService, private router: Router) { }

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    req = req.clone({
      withCredentials: true
    });

    const reqUrl = req.url;
    this._setLoading(reqUrl, true);


    return next.handle(req)
      .pipe(finalize(() => {
        this._setLoading(reqUrl, false);
      }))
      .pipe(catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          this._setLoading(reqUrl, false);
          this.router.navigate([this.authservice.loginUrl.toString()]);
          return EMPTY;
        }

        return throwError(() => err);
      }));
  }

  private _setLoading(reqUrl: string, loading: boolean): void {
    if (!reqUrl.endsWith('is-auth')) {
      this.apiService.$loading.next(loading);
    }
  }
}
