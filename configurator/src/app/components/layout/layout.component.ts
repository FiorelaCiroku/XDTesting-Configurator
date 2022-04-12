import { Component} from '@angular/core';
import { ApiService } from '../../services';
import { Observable, of} from 'rxjs';
import { Repository, ShortBranch } from '../../models';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../../constants';

@Component({
  selector: 'config-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

  $repos: Observable<Repository[]>;
  selectedRepo?: string | null;
  $branches?: Observable<ShortBranch[]>;
  selectedBranch?: string | null;
  displayModal = false;
  error?: string;
  displaySidebar = false;

  constructor(readonly apiService: ApiService) {
    this.$repos = this.apiService.listRepos();

    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    if (!this.selectedRepo || !this.selectedBranch) {
      this.displayModal = true;
    }

    if (this.selectedRepo) {
      this.updateBranches();
    }
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

    this.displayModal = false;

    if (previousRepo !== this.selectedRepo || previousBranch !== this.selectedBranch) {
      window.location.reload();
    }
  }

  updateBranches(): void {
    if (!this.selectedRepo) {
      this.$branches = of([]);
      return;
    }

    this.$branches = this.apiService.listBranches(this.selectedRepo);
  }
}
