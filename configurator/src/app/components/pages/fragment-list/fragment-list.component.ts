import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../../services';
import { Fragment } from '../../../models';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { Table } from 'primeng/table';

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

  @ViewChild('table', {read: Table}) table?: Table;
  @ViewChild('tableFilter', {read: ElementRef}) tableFilter?: ElementRef<HTMLInputElement>;


  constructor(public apiService: ApiService, private _router: Router) {
    const $sub = apiService.getFragments()
      .subscribe(fragments => {
        this.fragments = fragments;

        $sub.unsubscribe();
      });
  }

  clear(table: Table): void {
    table.clear();
    if (this.tableFilter?.nativeElement) {
      this.tableFilter.nativeElement.value = '';
    }
  }

  filterContent(e: Event): void {
    const input = e?.target as HTMLInputElement;

    if (!input) {
      return;
    }

    this.table?.filterGlobal(input.value, 'contains');
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
