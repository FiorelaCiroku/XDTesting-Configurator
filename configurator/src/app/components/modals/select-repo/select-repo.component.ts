import { Component } from '@angular/core';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../../../constants';
import { Repository, ShortBranch } from '../../../models';
import { ApiService } from '../../../services';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { Observable, of, switchMap, tap } from 'rxjs';

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
    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    this._init();
  }

  private _init(): void {
    const $sub = this.apiService.listRepos()
      .pipe(switchMap((repos): Observable<ShortBranch[]> => {
        this.repos = repos;

        if (this.selectedRepo) {
          return this.apiService.listBranches(this.selectedRepo)
            .pipe(tap((branches) => {
              this.branches = branches;
            }));
        }

        return of([]);
      }))
      .subscribe(() => {
        this.loading = false;
        $sub.unsubscribe();
      });
  }

  onRepositorySelection(): void {
    if (!this.selectedRepo) {
      this.branches = [];
      return;
    }

    this.selectedBranch = undefined;

    const $sub = this.apiService.listBranches(this.selectedRepo).subscribe(branches => {
      this.branches = branches;
      $sub.unsubscribe();
    });
  }


  saveRepository(): void {
    this.error = undefined;

    if (!this.selectedRepo || !this.selectedBranch) {
      this.error = 'No repository or branch selected';
      return;
    }

    const previousRepo = localStorage.getItem(SELECTED_REPO_KEY);
    const previousBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    localStorage.setItem(SELECTED_REPO_KEY, this.selectedRepo);
    localStorage.setItem(SELECTED_BRANCH_KEY, this.selectedBranch);

    this.ref.close();

    if (previousRepo !== this.selectedRepo || previousBranch !== this.selectedBranch) {
      window.location.reload();
    }
  }
}
