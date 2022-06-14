import { Component } from '@angular/core';
import { Ontology } from '../../../models';
import { DialogService } from 'primeng/dynamicdialog';
import { ApiService } from '../../../services';
import { catchError, of, switchMap, tap } from 'rxjs';
import { UploadOntologyComponent } from '../../modals';
import { SelectOntologyComponent } from '../../modals/select-ontology/select-ontology.component';

@Component({
  selector: 'config-ontology-list',
  templateUrl: './ontology-list.component.html',
  styleUrls: ['./ontology-list.component.scss'],
  providers: [DialogService]
})
export class OntologyListComponent {

  errorMsg?: string;
  successMsg?: string;
  ontologies: Ontology[] = [];
  showAlert = false;
  deleting = false;

  constructor(readonly apiService: ApiService, private dialogService: DialogService) {
    this._init();
  }

  addOntologyModal(): void {
    const ref = this.dialogService.open(UploadOntologyComponent, {
      header: 'Add a new ontology'
    });

    const $sub = ref.onClose.subscribe(() => {
      this._init();
      $sub.unsubscribe();
    });
  }

  deleteOntology(name: string): void {
    const confirmation = confirm('Are you sure? This will delete also all the associated fragments along with their tests. ' +
      'Files won\'t be removed. If you want to delete them, you should do it manually');

    if (!confirmation) {
      return;
    }

    this.deleting = true;

    const $sub = this.apiService.deleteOntology(name)
      .pipe(tap((res) => {
        this.errorMsg = undefined;
        this.successMsg = undefined;

        if (res.success) {
          this.successMsg = 'Ontology deleted successfully';
        } else {
          this.errorMsg = res.message;
        }

        this.showAlert = true;
      }))
      .pipe(switchMap(() => this.apiService.listOntologies()))
      .pipe(catchError((err) => {
        this.errorMsg = err;
        this.successMsg = undefined;
        return of([]);
      }))
      .subscribe(() => {
        this.deleting = false;
        $sub.unsubscribe();
      });
  }

  private _init(): void {
    const $sub = this.apiService.listOntologies()
      .pipe(catchError((err) => {
        this.errorMsg = err;
        this.showAlert = true;
        return of([]);
      }))
      .subscribe((ontologies) => {
        const toSelect = ontologies.filter(o => !o.userDefined && !o.parsed && !o.ignored);
        this.ontologies = ontologies.filter(o => o.userDefined || (o.parsed && !o.ignored));

        this._showOntologySelectionModal(toSelect);
        $sub.unsubscribe();
      });
  }

  private _showOntologySelectionModal(toSelect: Ontology[]): void {
    if (toSelect.length === 0) {
      return;
    }

    const ref = this.dialogService.open(SelectOntologyComponent, {
      header: 'New ontologies found',
      data: {
        toSelect
      }
    });

    const $sub = ref.onClose.subscribe(() => {
      this._init();
      $sub.unsubscribe();
    });
  }
}
