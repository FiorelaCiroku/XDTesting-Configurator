import { Component } from '@angular/core';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../../../constants';
import { Repository, ShortBranch } from '../../../models';
import { ApiService } from '../../../services';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { forkJoin, Observable, tap } from 'rxjs';

@Component({
  selector: 'config-select-repo',
  templateUrl: './select-repo.component.html',
  styleUrls: ['./select-repo.component.scss']
})
export class SelectRepoComponent {

  selectedRepo?: string | null;
  selectedBranch?: string | null;

  loading = true;
  repos: Repository[] = [];
  branches: ShortBranch[] = [];

  error?: string;


  constructor(private apiService: ApiService, public ref: DynamicDialogRef) {
    // get saved data, if any
    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    this._init();
  }

  /**
   * Initializes repositories and, possibly, branches list
   *
   * Branches list is initialized only if a repository has already been selected
   */
  private _init(): void {
    let $source: Observable<unknown>;
    const $repoSource = this.apiService.listRepos()
      .pipe(tap((repos) => { this.repos = repos; }));

    // if a repository has already been selected, list both repositories and branches for that repository
    // else, only list repositories
    // based on token's scope, it will only public or also private repositories
    if (this.selectedRepo) {
      $source = forkJoin([
        $repoSource,
        this.apiService.listBranches(this.selectedRepo)
          .pipe(tap((branches) => { this.branches = branches; }))
      ]);
    } else {
      $source = $repoSource;
    }

    this.loading = true;

    const $sub = $source.subscribe(() => {
      this.loading = false;
      $sub.unsubscribe();
    });
  }

  /**
   * Called when a repository is selected
   */
  onRepositorySelection(): void {
    // in any case, selected branch should be reset
    this.selectedBranch = undefined;

    // if selection is empty, reset branches list
    if (!this.selectedRepo) {
      this.branches = [];
      return;
    }

    this.loading = true;

    // get list of branches for selected repository
    const $sub = this.apiService.listBranches(this.selectedRepo).subscribe(branches => {
      this.branches = branches;
      this.loading = false;
      $sub.unsubscribe();
    });
  }

  /**
   * Called when user clicks on `Save` button
   */
  saveRepository(): void {
    this.error = undefined;

    // check for required fields
    if (!this.selectedRepo || !this.selectedBranch) {
      this.error = 'No repository or branch selected';
      return;
    }

    // get previous selections
    const previousRepo = localStorage.getItem(SELECTED_REPO_KEY);
    const previousBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    // store current selections
    localStorage.setItem(SELECTED_REPO_KEY, this.selectedRepo);
    localStorage.setItem(SELECTED_BRANCH_KEY, this.selectedBranch);

    // close the modal
    this.ref.close();

    // if previous selections are different w.r.t. the current ones, reload page
    if (previousRepo !== this.selectedRepo || previousBranch !== this.selectedBranch) {
      window.location.reload();
    }
  }
}
