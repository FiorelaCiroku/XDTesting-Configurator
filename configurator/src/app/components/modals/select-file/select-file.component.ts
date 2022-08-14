import { Component, OnInit} from '@angular/core';
import { ApiService } from '../../../services';
import { FileTypes, Fragment, FragmentFile } from '../../../models';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FILE_TYPES } from '../../../constants';

@Component({
  selector: 'config-select-file',
  templateUrl: './select-file.component.html',
  styleUrls: ['./select-file.component.scss'],
})
export class SelectFileComponent implements OnInit {

  error?: string;
  files: FragmentFile[] = [];
  loading = true;

  constructor(private _apiService: ApiService, private _ref: DynamicDialogRef, private _config: DynamicDialogConfig) {
  }

  ngOnInit(): void {
    // get modal data
    // data only available from this point on
    // see https://www.primefaces.org/primeng/dynamicdialog
    const fragment: Fragment = this._config.data?.fragment;
    const type: FileTypes = this._config.data?.fileType;

    if (!fragment || !type) {
      return;
    }

    // list files and prepare data to pass to files table
    const $sub = this._apiService.listTestFiles(fragment, type)
      .subscribe((files) => {
        const fileTypes = Object.entries(FILE_TYPES);
        this.files = [];
        this.files = files.map(f => {
          // split file name into chunks
          const nameChunks = f.name.split('.');
          // remove and get extension from filename
          // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
          const extension = nameChunks.splice(-1, 1)[0];
          const pathChunks = f.path.split('/');

          // determine file type
          let fileType: FileTypes = 'query';

          for (const [ft, spec] of fileTypes) {
            if (spec.folder === pathChunks[pathChunks.length - 2]) {
              fileType = ft as FileTypes;
            }
          }

          // build object
          return {
            name: nameChunks.join('.'),
            extension,
            type: fileType,
            path: f.path
          };

        });

        this.loading = false;

        setTimeout(() => {
          $sub.unsubscribe();
        });
      });
  }

  /**
   * Closes the modal returning the selected file
   * @param file Data returned from table
   */
  onFileSelected(file: FragmentFile): void {
    this._ref.close(file);
  }
}
