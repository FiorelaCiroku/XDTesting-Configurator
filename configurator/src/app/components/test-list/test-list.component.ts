import { Component } from '@angular/core';
import { TestDetail, TestType } from '../../models';
import { ApiService } from '../../services';
import { Router } from '@angular/router';
import { switchMap, tap } from 'rxjs';
import { TEST_TYPE_DEFINITIONS } from '../../constants';

@Component({
  selector: 'config-test-list',
  templateUrl: './test-list.component.html',
  styleUrls: ['./test-list.component.scss']
})
export class TestListComponent {

  testTypes = TEST_TYPE_DEFINITIONS;
  tests: TestDetail[] = [];
  deleting = false;
  error?: string;
  showAlert = false;

  constructor(public apiService: ApiService, private _router: Router) {
    this.apiService.$loading.next(true);

    const $sub = apiService.getTests()
      .subscribe(fragments => {
        this.tests = fragments;
        this.apiService.$loading.next(false);

        $sub.unsubscribe();
      });
  }

  testLabel(testType: TestType): string {
    return this.testTypes[testType].label;
  }


  removeTest(id: string): void {
    if (!confirm('Are you sure? All data will be lost')) {
      return;
    }

    this.deleting = true;

    const $sub = this.apiService.deleteTest(id)
      .pipe(tap((result) => {
        this.showAlert = true;

        if (!result.success) {
          this.error = result.message || `Unknown error during deletion of fragment ${id}`;
        }
      }))
      .pipe(switchMap(() => this.apiService.getTests()))
      .subscribe((tests) => {
        this.tests = tests;
        this.deleting = false;
        $sub.unsubscribe();
      });
  }
}
