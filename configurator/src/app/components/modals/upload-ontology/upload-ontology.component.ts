import { Component } from '@angular/core';
import { markAllAsDirty } from '../../../utils';
import { catchError, of, tap } from 'rxjs';
import { TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { ApiService } from '../../../services';
import { OntologyForm } from '../../../models';

@Component({
  selector: 'config-upload-ontology',
  templateUrl: './upload-ontology.component.html',
  styleUrls: ['./upload-ontology.component.scss']
})
export class UploadOntologyComponent {

  successMsg?: string;
  errorMsg?: string;
  showAlert = false;
  uploading = false;
  uploadOntology = false;

  formGroup: TypedFormGroup<OntologyForm>;

  constructor(private apiService: ApiService) {
    // create form group in constructor to avoid type issues and angular problems
    this.formGroup = new TypedFormGroup<OntologyForm>({
      name: new TypedFormControl<string>(),
      url: new TypedFormControl<string>(),
      file: new TypedFormControl<FileList>()
    });
  }

  /**
   * Resets url and file fields in case `uploadOntology` changes value
   */
  onToggle(): void {
    this.formGroup.patchValue({
      url: undefined,
      file: undefined
    });
  }

  /**
   * Creates a new ontology in `UserInput.json` and, if provided, uploads ontology `.owl` file
   */
  upload(): void {
    this.errorMsg = undefined;
    this.successMsg = undefined;
    this.showAlert = false;

    // check form group validity and, possibly, mark fields as touched and dirty
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();
      markAllAsDirty(this.formGroup);
      return;
    }

    // get form value
    const fgValue = this.formGroup.value;

    // should never happen
    if (!fgValue) {
      this.errorMsg = 'Unknown error';
      this.showAlert = true;
      return;
    }

    // disable inputs to prevent user modifications during API call
    this.formGroup.disable();
    this.uploading = true;

    const $sub = this.apiService.uploadOntology(fgValue)
      .pipe(tap((res) => {
        console.log(res);
        if (res.success) {
          this.successMsg = 'Ontology uploaded successfully';
        } else {
          this.errorMsg = res.message || 'Unknown error';
        }
      }))
      .pipe(catchError(err => {
        this.errorMsg = err;
        return of(undefined);
      }))
      .subscribe(() => {
        this.uploading = false;
        this.showAlert = true;

        // re-enable form
        this.formGroup.enable();
        $sub.unsubscribe();
      });
  }
}
