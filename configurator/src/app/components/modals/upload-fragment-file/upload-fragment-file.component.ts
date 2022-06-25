import { Component, OnInit } from '@angular/core';
import { FILE_TYPES } from '../../../constants';
import { ApiService } from '../../../services';
import { TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { FileTypes, Fragment } from '../../../models';
import { markAllAsDirty } from '../../../utils';
import { catchError, of, tap } from 'rxjs';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'config-upload-fragment-file',
  templateUrl: './upload-fragment-file.component.html',
  styleUrls: ['./upload-fragment-file.component.scss']
})
export class UploadFragmentFileComponent implements OnInit {

  successMsg?: string;
  errorMsg?: string;
  fileTypes = FILE_TYPES;
  formGroup: TypedFormGroup<{fileType: FileTypes, file: FileList}>;
  showAlert = false;
  uploading = false;


  constructor(private apiService: ApiService, private config: DynamicDialogConfig) {
    // create form group in constructor to avoid type issues and angular problems
    this.formGroup = new TypedFormGroup<{fileType: FileTypes, file: FileList}>({
      fileType: new TypedFormControl<FileTypes>(),
      file: new TypedFormControl<FileList>()
    });
  }

  ngOnInit(): void {
    //
  }

  /**
   * Upload fragment file to `/.xd-testing/ontology-name/fragment-name`
   * @param e Submit event
   */
  upload(e: Event): void {
    e.preventDefault();

    // get data
    // data only available from this point on, see https://www.primefaces.org/primeng/dynamicdialog
    const fragment: Fragment = this.config.data.fragment;

    if (!fragment) {
      this.errorMsg = 'Unknown fragment. Application error';
      this.showAlert = true;
      return;
    }

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

    const $sub = this.apiService.uploadTestFile(fgValue.file[0], fgValue.fileType, fragment)
      .pipe(tap((res) => {
        if (res.success) {
          this.successMsg = 'Files uploaded successfully';
        } else {
          this.errorMsg = res.message;
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
