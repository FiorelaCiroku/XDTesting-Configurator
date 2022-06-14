import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { ApiResult, Ontology } from '../../../models';
import { ApiService } from '../../../services';
import { catchError, Observable, of } from 'rxjs';

@Component({
  selector: 'config-select-ontology',
  templateUrl: './select-ontology.component.html',
  styleUrls: ['./select-ontology.component.scss']
})
export class SelectOntologyComponent implements OnInit {
  toSelect: Ontology[] = [];
  success = true;
  showAlert = false;
  message?: string;
  selectedOntologies: Ontology[] = [];
  saving = false;


  constructor(private apiService: ApiService, private config: DynamicDialogConfig) { }

  ngOnInit(): void {
    const data = this.config.data;

    if (!data) {
      return;
    }

    this.toSelect = data.toSelect;
  }

  save(): void {
    for (const selected of this.toSelect) {
      const toKeep = this.selectedOntologies.includes(selected);
      selected.ignored = !toKeep;
      selected.parsed = true;
      selected.userDefined = false;
    }

    this.saving = true;

    this.apiService.updateOntologies(this.toSelect)
      .pipe(catchError((err): Observable<ApiResult> => {
        return of({success: false, message: err});
      }))
      .subscribe((result) => {
        this.success = result.success;
        this.message = result.success ? 'Ontologies saved successfully' : result.message;
        this.showAlert = true;
        this.saving = false;
      });
  }
}
