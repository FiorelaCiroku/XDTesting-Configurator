import { Component, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { HomeParams } from '../../models';
import { baseUrl } from '../../../environments/environment';

@Component({
  selector: 'config-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnDestroy {

  canceled = false;
  serverBaseUrl = baseUrl;

  private _sub: Subscription;

  constructor(private httpClient: HttpClient, private route: ActivatedRoute) {
    this._sub = this.route.queryParams.subscribe((params: HomeParams) => {
      this.canceled = params.canceled === '1';
    });
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
  }
}
