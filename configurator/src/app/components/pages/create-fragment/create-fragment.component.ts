import { Component } from '@angular/core';
import { TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { ApiResult, Fragment, FragmentForm, Ontology } from '../../../models';
import { ApiService } from '../../../services';
import { catchError, Observable, of, switchMap } from 'rxjs';
import { Summary } from '../../shared/summary/summary.component';
import { markAllAsDirty, toggleDisableControls } from 'src/app/utils';

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
    // create form group in constructor to avoid type issues and angular problems
    this.formGroup = new TypedFormGroup<FragmentForm>({
      ontologyName: new TypedFormControl<string>(''),
      name: new TypedFormControl<string>(''),
      file: new TypedFormControl<FileList>()
    });

    // get ontologies from api
    this._apiService.listOntologies()
      .pipe(catchError((err) => {
        // in case of error, display alert
        this.errorMsg = err;
        this.showAlert = true;
        return of([]);
      }))
      .subscribe(ontologies => {
        this.ontologies = ontologies;
      });
  }

  /**
   * Uploads fragment file and creates a new fragment in `UserInput.json`
   */
  createFragment(): void {
    if (!this.formGroup.valid) {
      // in case the form is invalid, mark all as touched and dirty
      // this shows the feedback
      this.formGroup.markAllAsTouched();
      markAllAsDirty(this.formGroup);
      return;
    }

    // disable controls to prevent the user clicks on them while saving
    toggleDisableControls(this.formGroup);

    // get form's value
    const data = this.formGroup.value;

    const fragment: Fragment = {
      name: data?.name || '',
      ontologyName: data?.ontologyName || ''
    };

    // upload fragment file first
    const $sub = this._apiService.uploadFragmentFile(data?.file?.[0], fragment)
      .pipe(switchMap((res) => {
        // set just uploaded file name
        fragment.fileName = `${fragment.ontologyName}/${fragment.name}/${res.data}`;

        // create fragment in UserInput.json
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
}
