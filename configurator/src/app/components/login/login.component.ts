import { Component, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, EMPTY, filter, from, of, Subscription, switchMap} from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginAuthParams } from '../../models';
import { baseUrl } from '../../../environments/environment';

@Component({
  selector: 'config-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {

  error?: string;
  canceled = false;
  serverBaseUrl = baseUrl;
  authenticating = false;
  private _sub: Subscription;


  constructor(private httpClient: HttpClient, private route: ActivatedRoute, private router: Router) {
    this._sub = this.route.queryParams
      .pipe(filter((p) => !!p))
      .pipe(switchMap((params: LoginAuthParams) => {
        if (route.routeConfig?.path === 'auth' && params.code) {
          this.authenticating = true;
          return this.httpClient.get(`${baseUrl}/login-callback?code=${params.code}`);
        }
        console.log('Empty');
        return EMPTY;
      }))

      .pipe(switchMap(() => from( this.router.navigate(['/fragments']) ) ))

      .pipe(catchError((err: HttpErrorResponse) => {
        this.error = err.message;
        return of(null);
      }))

      .subscribe(() => {
        console.log('sub');
        this.authenticating = false;
      });
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
  }
}
