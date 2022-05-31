import { Component, OnInit } from '@angular/core';
import { FILE_TYPES } from '../../../constants';
import { ApiService } from '../../../services';
import { TypedFormControl, TypedFormGroup } from '../../../utils/typed-form';
import { FileTypes, Fragment } from '../../../models';
import { markAllAsTouchedOrDirty } from '../../../utils';
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
    this.formGroup = new TypedFormGroup<{fileType: FileTypes, file: FileList}>({
      fileType: new TypedFormControl<FileTypes>(),
      file: new TypedFormControl<FileList>()
    });
  }

  ngOnInit(): void {
    //
  }

  upload(e: Event): void {
    e.preventDefault();
    const fragment: Fragment = this.config.data.fragment;

    if (!fragment) {
      this.errorMsg = 'Unknown fragment name. Application error';
      this.showAlert = true;
      return;
    }


    if (!this.formGroup.valid) {
      markAllAsTouchedOrDirty(this.formGroup);
      markAllAsTouchedOrDirty(this.formGroup, true);
      return;
    }

    const fgValue = this.formGroup.value;

    if (!fgValue) {
      this.errorMsg = 'Unknown error';
      this.showAlert = true;
      return;
    }

    this.formGroup.disable();
    this.uploading = true;

    const $sub = this.apiService.uploadFile(fgValue.file[0], fgValue.fileType, fragment)
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
        this.formGroup.enable();
        $sub.unsubscribe();
      });
  }
}
