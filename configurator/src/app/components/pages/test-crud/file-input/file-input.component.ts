import { Component, EventEmitter, Input, OnChanges, Output, SimpleChange } from '@angular/core';
import { FileInputFormGroupSpec } from '../../../../models';


@Component({
  selector: 'config-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent implements OnChanges {

  @Input() showDefaultInput = true;
  @Input() formGroupSpec?: FileInputFormGroupSpec;

  @Output() onShowExistingFiles = new EventEmitter<FileInputFormGroupSpec>();
  @Output() onToggleUploadOrSelectUploaded = new EventEmitter<boolean>();

  uploadFile = false;
  useUploadedFile = false;
  currentFile?: string;

  constructor() {
    //
  }

  ngOnChanges({formGroup}: {formGroup?: SimpleChange}): void {
    if (formGroup && formGroup.currentValue !== formGroup.previousValue) {
      this.currentFile = this.formGroupSpec?.formGroup.controls.fileName.value;
    }
  }

  shouldShowNewFile(): boolean {
    const fg = this.formGroupSpec?.formGroup;

    if (!fg) {
      return false;
    }

    return (fg.controls.file.value && fg.controls.file.value !== this.currentFile) ||
      (fg.controls.fileName.value && fg.controls.fileName.value !== this.currentFile);
  }

  onToggle(): void {
    this.formGroupSpec?.formGroup.controls.file.reset();
    this.formGroupSpec?.formGroup.controls.fileName.reset();
    this.formGroupSpec?.formGroup.controls.content?.reset();

    this.onToggleUploadOrSelectUploaded.emit(this.uploadFile || this.useUploadedFile);
  }
}
