import { Component} from '@angular/core';
import { ApiService } from '../../services';
import { SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../../constants';
import { DialogService } from 'primeng/dynamicdialog';
import { SelectRepoComponent } from '../modals';
import { WindowWrapper } from 'src/app/wrappers';

@Component({
  selector: 'config-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  providers: [DialogService]
})
export class LayoutComponent {

  selectedRepo?: string | null;
  selectedBranch?: string | null;
  displaySidebar = false;
  loading = true;

  constructor(readonly apiService: ApiService, private dialogService: DialogService) {
    this.selectedRepo = localStorage.getItem(SELECTED_REPO_KEY);
    this.selectedBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    if (!this.selectedRepo || !this.selectedBranch) {
      this.openModal(false);
    }
  }

  openModal(closable = true): void {
    const previousRepo = localStorage.getItem(SELECTED_REPO_KEY);
    const previousBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

    const ref = this.dialogService.open(SelectRepoComponent, { header: 'Repository', closable });

    const $sub = ref.onClose.subscribe(() => {
      const currentRepo = localStorage.getItem(SELECTED_REPO_KEY);
      const currentBranch = localStorage.getItem(SELECTED_BRANCH_KEY);

      if (currentBranch !== previousBranch || currentRepo !== previousRepo) {
        WindowWrapper.reload();
      }

      $sub.unsubscribe();
    });
  }
}
