import { Component } from '@angular/core';
import { Ontology } from '../../../models';
import { DialogService } from 'primeng/dynamicdialog';
import { ApiService } from '../../../services';
import { catchError, EMPTY, of, switchMap, tap } from 'rxjs';
import { UploadOntologyComponent } from '../../modals';

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
        return EMPTY;
      }))
      .subscribe(() => {
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
        this.ontologies = ontologies;
        $sub.unsubscribe();
      });
  }
}
