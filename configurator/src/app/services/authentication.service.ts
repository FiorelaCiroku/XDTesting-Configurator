import { Injectable } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { baseUrl } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService implements CanActivate {

  readonly loginUrl: UrlTree;
  private _isAuthenticated = false;

  set isAuthenticated(value: boolean) {
    this._isAuthenticated = value;
  }

  constructor(router: Router, private httpClient: HttpClient) {
    this.loginUrl = router.parseUrl('login');
  }

  canActivate(/*route: ActivatedRouteSnapshot, state: RouterStateSnapshot*/): Observable<boolean | UrlTree> {
    if (!this._isAuthenticated) {
      return this.httpClient.get<never>(`${baseUrl}/is-auth`)
      .pipe(map(() => {
        this._isAuthenticated = true;
        return true;
      }))
      .pipe(catchError(() => of(this.loginUrl)));
    }

    return of(true);
  }
}
