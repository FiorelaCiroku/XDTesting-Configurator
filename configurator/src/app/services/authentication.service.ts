import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, switchMap } from 'rxjs';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { baseUrl } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService implements CanActivate {

  readonly $isAuthenticated = new BehaviorSubject<boolean>(false);
  readonly loginUrl: UrlTree;

  constructor(private router: Router, private httpClient: HttpClient) {
    this.loginUrl = router.parseUrl('login');
  }

  canActivate(/*route: ActivatedRouteSnapshot, state: RouterStateSnapshot*/): Observable<boolean | UrlTree> {
    return this.$isAuthenticated
      .pipe(switchMap(isAuth => {
        if (!isAuth) {
          return this.httpClient.get<never>(`${baseUrl}/is-auth`)
            .pipe(map(() => true));
        }

        return of(true);
      }));
  }
}
