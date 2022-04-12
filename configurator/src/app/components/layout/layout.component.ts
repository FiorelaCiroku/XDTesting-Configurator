import { Component} from '@angular/core';
import { ApiService } from '../../services';
import { TestingType } from '../../models';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY, SELECTED_TESTING_TYPE_KEY } from '../../constants';
import { DialogService } from 'primeng/dynamicdialog';
import { SelectRepoComponent } from '../select-repo/select-repo.component';

@Component({
  selector: 'config-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  providers: [DialogService]
})
export class LayoutComponent {

  selectedRepo?: string | null;
  selectedBranch?: string | null;
  selectedTestingType?: TestingType;
  displaySidebar = false;

  constructor(readonly apiService: ApiService, public dialogService: DialogService) {
    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);
    this.selectedTestingType = localStorage.getItem(SELECTED_TESTING_TYPE_KEY) as TestingType | undefined;

    if (!this.selectedRepo || !this.selectedBranch || !this.selectedTestingType) {
      this.openModal();
    }
  }

  openModal(): void {
    const previousRepo = localStorage.getItem(SELECTED_REPO_KEY);
    const previousBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    const ref = this.dialogService.open(SelectRepoComponent, { header: 'Repository' });

    const $sub = ref.onClose.subscribe(() => {
      const currentRepo = localStorage.getItem(SELECTED_REPO_KEY);
      const currentBranch = localStorage.getItem(SELECTED_REPO_KEY);

      if (currentBranch !== previousBranch || currentRepo !== previousRepo) {
        window.location.reload();
      }

      $sub.unsubscribe();
    });
  }
}
