import { Component} from '@angular/core';
import { ApiService } from '../../services';
import { Fragment } from '../../models';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';

@Component({
  selector: 'config-fragment-list',
  templateUrl: './fragment-list.component.html',
  styleUrls: ['./fragment-list.component.scss']
})
export class FragmentListComponent {
  fragments: Fragment[] = [];
  deleting = false;
  error?: string;
  showAlert = false;

  constructor(public apiService: ApiService, private _router: Router) {
    this.apiService.$loading.next(true);

    const $sub = apiService.getFragments()
      .subscribe(fragments => {
        this.fragments = fragments;
        this.apiService.$loading.next(false);

        $sub.unsubscribe();
      });
  }


  removeFragment(name: string): void {
    if (!confirm('Are you sure? All data will be lost')) {
      return;
    }

    this.deleting = true;

    const $sub = this.apiService.deleteFragment(name)
      .pipe(tap((result) => {
        this.showAlert = true;

        if (!result.success) {
          this.error = result.message || `Unknown error during deletion of fragment ${name}`;
        }
      }))
      .pipe(switchMap(() => this.apiService.getFragments()))
      .subscribe((fragments) => {
        this.fragments = fragments;
        this.deleting = false;
        $sub.unsubscribe();
      });
  }
}
