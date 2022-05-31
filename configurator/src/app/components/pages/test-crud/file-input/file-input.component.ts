import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChange } from '@angular/core';
import { TypedFormGroup } from '../../../../utils/typed-form';
import { FileInputFormGroup, FileInputFormGroupSpec } from '../../../../models';


@Component({
  selector: 'config-file-input',
  templateUrl: './file-input.component.html',
  styleUrls: ['./file-input.component.scss']
})
export class FileInputComponent implements OnInit, OnChanges {

  @Input() showDefaultInput = true;
  @Input() formGroups?: FileInputFormGroupSpec[];

  @Output() onShowExistingFiles = new EventEmitter<FileInputFormGroupSpec>();
  @Output() onToggleUploadOrSelectUploaded = new EventEmitter();

  uploadFile: boolean[] = [];
  useUploadedFile: boolean[] = [];
  currentFiles: string[] = [];

  get showContentInput(): boolean {
    return !this.uploadFile.reduce((acc, next) => acc || next, false) &&
      !this.useUploadedFile.reduce((acc, next) => acc || next, false);
  }

  constructor() {
    //
  }

  ngOnInit(): void {
    this._resetSwitchModels();
    this._updateCurrentFiles();
  }

  ngOnChanges({formGroups}: {formGroups?: SimpleChange}): void {
    if (formGroups && !formGroups.isFirstChange() && formGroups.currentValue !== formGroups.previousValue) {
      this._updateCurrentFiles();
    }
  }

  onToggle(index: number, fg: TypedFormGroup<FileInputFormGroup>, checked: boolean): void {
    fg.controls.file.reset();
    fg.controls.fileName.reset();
    fg.controls.content?.reset();

    const shouldHideContentInput = checked || this.uploadFile.reduce((acc, next) => acc && next, true);

    if (!this.formGroups?.length) {
      return;
    }

    if (shouldHideContentInput) {
      const uploadFile: boolean[] = [];
      for (let i = 0; i < this.formGroups.length; i++) {
        uploadFile.push(true);
      }

      this.uploadFile = uploadFile;
    } else {
      this._resetSwitchModels();
    }
  }

  private _resetSwitchModels(): void {
    if (!this.formGroups?.length) {
      return;
    }

    const uploadFile: boolean[] = [];
    const useUploadedFile: boolean[] = [];

    for (let i = 0; i < this.formGroups.length; i++) {
      uploadFile.push(false);
      useUploadedFile.push(false);
    }

    this.uploadFile = uploadFile;
    this.useUploadedFile = useUploadedFile;
  }

  private _updateCurrentFiles(): void {
    const currentFiles = [];

    for (const fg of this.formGroups || []) {
      currentFiles.push(fg.formGroup.controls.fileName.value);
    }
  }
}
