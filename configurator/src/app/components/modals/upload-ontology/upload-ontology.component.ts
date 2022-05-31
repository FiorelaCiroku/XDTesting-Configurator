import { Component } from '@angular/core';
import { markAllAsTouchedOrDirty } from '../../../utils';
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
    this.formGroup = new TypedFormGroup<OntologyForm>({
      name: new TypedFormControl<string>(),
      url: new TypedFormControl<string>(),
      file: new TypedFormControl<FileList>()
    });
  }

  onToggle(): void {
    this.formGroup.patchValue({
      url: undefined,
      file: undefined
    });
  }

  upload(): void {
    if (!this.formGroup.valid) {
      markAllAsTouchedOrDirty(this.formGroup);
      markAllAsTouchedOrDirty(this.formGroup, true);
      return;
    }

    const fgValue = this.formGroup.value;
    console.log('valid', fgValue);

    if (!fgValue) {
      this.errorMsg = 'Unknown error';
      this.showAlert = true;
      return;
    }

    this.formGroup.disable();
    this.uploading = true;

    const $sub = this.apiService.uploadOntology(fgValue)
      .pipe(tap((res) => {
        this.successMsg = undefined;
        this.errorMsg = undefined;

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
        this.formGroup.enable();
        $sub.unsubscribe();
      });
  }
}
