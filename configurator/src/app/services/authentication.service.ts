import { Injectable } from '@angular/core';
import { BehaviorSubject, catchError, map, Observable, of, switchMap } from 'rxjs';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { baseUrl } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService implements CanActivate {

  readonly $isAuthenticated = new BehaviorSubject<boolean>(false);
  readonly loginUrl: UrlTree;

  constructor(router: Router, private httpClient: HttpClient) {
    this.loginUrl = router.parseUrl('login');
  }

  canActivate(/*route: ActivatedRouteSnapshot, state: RouterStateSnapshot*/): Observable<boolean | UrlTree> {
    return this.$isAuthenticated
      .pipe(switchMap(isAuth => {
        // if is not authenticated, let the server tell the frontend if the user has a valid token
        // server will return
        // - 200 if user is authenticated
        // - 401 if user is not authenticated
        // the latter case will made the application redirect to login page
        if (!isAuth) {
          return this.httpClient.get<never>(`${baseUrl}/is-auth`)
            .pipe(map(() => true))
            .pipe(catchError(() => of(this.loginUrl)));
        }

        return of(true);
      }));
  }
}
