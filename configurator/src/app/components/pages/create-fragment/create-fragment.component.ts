import { Component } from '@angular/core';
import { TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { ApiResult, Fragment, FragmentForm, Ontology } from '../../../models';
import { ApiService } from '../../../services';
import { catchError, Observable, of, switchMap } from 'rxjs';
import { Summary } from '../../shared/summary/summary.component';

@Component({
  selector: 'config-create-fragment',
  templateUrl: './create-fragment.component.html',
  styleUrls: ['./create-fragment.component.scss']
})
export class CreateFragmentComponent {

  saved?: boolean;
  errorMsg?: string;
  formGroup: TypedFormGroup<FragmentForm>;
  showAlert = false;
  ontologies: Ontology[] = [];
  summary: Summary[] = [];

  constructor(private _apiService: ApiService) {
    this.formGroup = new TypedFormGroup<FragmentForm>({
      ontologyName: new TypedFormControl<string>(''),
      name: new TypedFormControl<string>(''),
      file: new TypedFormControl<FileList>()
    });

    this._apiService.listOntologies()
      .pipe(catchError((err) => {
        this.errorMsg = err;
        this.showAlert = true;
        return of([]);
      }))
      .subscribe(ontologies => {
        this.ontologies = ontologies;
      });
  }

  createFragment(): void {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();

      for (const control of Object.values(this.formGroup.controls)) {
        control.markAsDirty();
      }

      return;
    }

    this._toggleDisableControls();
    const data = this.formGroup.value;

    const fragment: Fragment = {
      name: data?.name || '',
      ontologyName: data?.ontologyName || ''
    };

    const $sub = this._apiService.uploadFragmentFile(data?.file?.[0], fragment)
      .pipe(switchMap((res) => {
        fragment.fileName = `${fragment.ontologyName}/${fragment.name}/${res.data}`;
        return this._apiService.createFragment(fragment);
      }))
      .pipe(catchError((err): Observable<ApiResult> => {
        return of({success: false, message: err});
      }))
      .subscribe((result) => {
        this.saved = result.success;
        this.errorMsg = result.message;
        this.showAlert = true;

        this.summary = [{
          label: 'Ontology Name',
          data: data?.ontologyName || '',
        }, {
          label: 'Ontology fragment Name',
          data: data?.name || ''
        }];

        $sub.unsubscribe();
      });

  }

  private _toggleDisableControls(): void {
    if (this.formGroup.disabled) {
      this.formGroup.enable();
      return;
    }

    this.formGroup.disable();
  }
}
