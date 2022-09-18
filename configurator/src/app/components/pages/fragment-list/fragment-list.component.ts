import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../../services';
import { Fragment } from '../../../models';
import { switchMap, tap } from 'rxjs';
import { Table } from 'primeng/table';
import { WindowWrapper } from 'src/app/wrappers';

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

  // gets table and table filter elements' class instance
  @ViewChild('table', {read: Table}) table?: Table;
  @ViewChild('tableFilter', {read: ElementRef}) tableFilter?: ElementRef<HTMLInputElement>;


  constructor(public apiService: ApiService) {
    // get fragment list
    const $sub = apiService.getFragments()
      .subscribe(fragments => {
        this.fragments = fragments;
        $sub.unsubscribe();
      });
  }

  /**
   * Clears table's filters
   */
  clear(): void {
    this.table?.clear();

    if (this.tableFilter?.nativeElement) {
      this.tableFilter.nativeElement.value = '';
    }
  }

  /**
   * Performs free-text table filter
   * @param e Search event
   */
  filterContent(e: Event): void {
    const input = e.target as HTMLInputElement;

    if (!input) {
      return;
    }

    this.table?.filterGlobal(input.value, 'contains');
  }

  /**
   * Removes fragment from `UserData.json`. Won't remove any file associated with fragment
   * @param fragment Fragment to remove
   */
  removeFragment(fragment: Fragment): void {
    // Browser native confirmation. Asks user to confirm operation before actually execute it.
    if (!WindowWrapper.confirm('Are you sure? All data will be lost')) {
      return;
    }

    this.deleting = true;

    // deletes fragment and shows alert
    const $sub = this.apiService.deleteFragment(fragment)
      .pipe(tap((result) => {
        this.showAlert = true;

        if (!result.success) {
          this.error = result.message || `Unknown error during deletion of fragment ${fragment.name}`;
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
