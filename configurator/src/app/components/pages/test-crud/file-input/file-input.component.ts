import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FileInputFormGroupSpec } from '../../../../models';


@Component({
  selector: 'config-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent {

  @Input() showDefaultInput = true;
  @Input() formGroupSpec?: FileInputFormGroupSpec;
  @Input() currentFile?: string;

  @Output() onShowExistingFiles = new EventEmitter<FileInputFormGroupSpec>();
  @Output() onToggleUploadOrSelectUploaded = new EventEmitter<boolean>();

  uploadFile = false;
  useUploadedFile = false;
  selectedNewFile = false;

  constructor() {
    //
  }

  shouldShowNewFile(): boolean {
    const fg = this.formGroupSpec?.formGroup;

    if (!fg) {
      return false;
    }

    return this.selectedNewFile && (
      fg.controls.file.value?.length || (
        fg.controls.fileName.value &&
        fg.controls.fileName.value !== this.currentFile
      )
    );
  }

  onToggle(): void {
    this.formGroupSpec?.formGroup.controls.file.reset();
    this.formGroupSpec?.formGroup.controls.fileName.reset();
    this.formGroupSpec?.formGroup.controls.content?.reset();

    this.onToggleUploadOrSelectUploaded.emit(this.uploadFile || this.useUploadedFile);
  }

  pickExisting(): void {
    this.selectedNewFile = true;
    this.onShowExistingFiles.emit(this.formGroupSpec);
  }
}
