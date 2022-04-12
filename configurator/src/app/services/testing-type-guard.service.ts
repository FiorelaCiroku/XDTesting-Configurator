import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';
import { SELECTED_TESTING_TYPE_KEY } from '../constants';
import { TestingType } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TestingTypeGuardService implements CanActivate {

  private readonly fragmentsHomeUrl: UrlTree;
  private readonly testsHomeUrl: UrlTree;
  private readonly actionsUrl: UrlTree;

  constructor(private router: Router) {
    this.fragmentsHomeUrl = this.router.parseUrl('fragments');
    this.testsHomeUrl = this.router.parseUrl('tests');
    this.actionsUrl = this.router.parseUrl('actions');
  }

  canActivate(route: ActivatedRouteSnapshot/*, state: RouterStateSnapshot*/): boolean | UrlTree {
    const testingType = localStorage.getItem(SELECTED_TESTING_TYPE_KEY) as TestingType | null;
    const currentUrl = route.url.join('/');

    if (testingType) {
      if (currentUrl.startsWith('fragments')) {
        if (testingType === 'XD_TESTING') {
          return true;
        }

        return this.testsHomeUrl;
      } else if (currentUrl.startsWith('tests')) {
        if (testingType === 'STANDARD') {
          return true;
        }

        return this.fragmentsHomeUrl;
      }
    }

    return this.actionsUrl;
  }


}
