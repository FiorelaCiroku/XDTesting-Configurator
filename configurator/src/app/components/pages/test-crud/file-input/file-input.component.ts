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

  /**
   * Calculates whether should be rendered new file label or not
   * @returns Whether should be rendered new file label
   */
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

  /**
   * Actions to perform when a switch is toggled. It resets file, fileName and content fields
   */
  onToggle(): void {
    this.formGroupSpec?.formGroup.controls.file.reset();
    this.formGroupSpec?.formGroup.controls.fileName.reset();
    this.formGroupSpec?.formGroup.controls.content?.reset();

    // signals to parent component that a switch has been toggled
    this.onToggleUploadOrSelectUploaded.emit(this.uploadFile || this.useUploadedFile);
  }

  /**
   * Signals to parent that user wants to select a new file from the list of existing ones
   */
  pickExisting(): void {
    this.selectedNewFile = true;
    this.onShowExistingFiles.emit(this.formGroupSpec);
  }
}
