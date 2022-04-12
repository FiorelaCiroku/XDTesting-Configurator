import { Component } from '@angular/core';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY, SELECTED_TESTING_TYPE_KEY } from '../../constants';
import { Repository, ShortBranch, TestingType } from '../../models';
import { ApiService } from '../../services';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, of, switchMap } from 'rxjs';

@Component({
  selector: 'config-select-repo',
  templateUrl: './select-repo.component.html',
  styleUrls: ['./select-repo.component.scss']
})
export class SelectRepoComponent {

  selectedRepo?: string | null;
  selectedBranch?: string | null;
  selectedTestingType?: TestingType;

  loading = true;
  repos: Repository[] = [];
  branches: ShortBranch[] = [];
  testingType?: TestingType;

  error?: string;


  constructor(private apiService: ApiService, public ref: DynamicDialogRef) {
    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    this._init();
  }

  private _init(): void {
    const $sub = this.apiService.listRepos()
      .pipe(switchMap((repos): Observable<ShortBranch[]> => {
        this.repos = repos;

        if (this.selectedRepo) {
          return this.apiService.listBranches(this.selectedRepo);
        }

        return of([]);
      }))
      .pipe(switchMap((branches): Observable<TestingType | undefined> => {
        this.branches = branches;

        if (this.selectedRepo && this.selectedBranch && branches.length > 0) {
          return this.apiService.getTestingType(this.selectedRepo, this.selectedBranch);
        }

        return of(undefined);
      }))
      .subscribe(testingType => {
        this.selectedTestingType = this.testingType = testingType;
        this.loading = false;
        $sub.unsubscribe();
      });
  }

  onRepositorySelection(): void {
    console.log('on repo selection');
    if (!this.selectedRepo) {
      this.branches = [];
      return;
    }

    this.selectedBranch = undefined;
    this.selectedTestingType = undefined;

    const $sub = this.apiService.listBranches(this.selectedRepo).subscribe(branches => {
      this.branches = branches;
      $sub.unsubscribe();
    });
  }


  onBranchSelection(): void {
    console.log('branch selection');
    if (!this.selectedRepo || !this.selectedBranch) {
      return;
    }

    this.selectedTestingType = undefined;
    this.loading = true;
    const $sub = this.apiService.getTestingType(this.selectedRepo, this.selectedBranch)
      .subscribe(res => {
        this.testingType = res;
        this.loading = false;
        $sub.unsubscribe();
      });
  }


  onTestingTypeSelection(): void {
    console.log('testing type selection');

    if (this.testingType && this.testingType !== this.selectedTestingType) {
      alert('WARNING:\nchoosing a different testing type will erase all of your defined fragment and tests.');
    }
  }


  saveRepository(): void {
    this.error = undefined;

    if (!this.selectedRepo || !this.selectedBranch || !this.selectedTestingType) {
      this.error = 'No repository, branch or testing type, selected';
      return;
    }

    localStorage.setItem(SELECTED_REPO_KEY, this.selectedRepo);
    localStorage.setItem(SELECTED_BRANCH_KEY, this.selectedBranch);

    const selectedTestingType = this.selectedTestingType;

    const $sub = this.apiService.updateTestingType(this.selectedRepo, this.selectedBranch, selectedTestingType)
      .subscribe(res => {
        if (!res.success) {
          this.error = res.message;
          $sub.unsubscribe();
        }

        localStorage.setItem(SELECTED_TESTING_TYPE_KEY, selectedTestingType);

        this.ref.close();
      });

  }
}
