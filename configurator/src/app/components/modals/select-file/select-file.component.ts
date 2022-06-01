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
    const fragment: Fragment = this._config.data.fragment;
    const type: FileTypes = this._config.data.fileType;

    if (!fragment || !type) {
      return;
    }

    const $sub = this._apiService.listTestFiles(fragment, type)
      .subscribe((files) => {
        const fileTypes = Object.values(FILE_TYPES);
        this.files = [];
        this.files = files.map(f => {
          const nameChunks = f.name.split('.');
          const extension = nameChunks.splice(-1, 1)[0];
          const pathChunks = f.path.split('/');
          const fileType = fileTypes.find(ft => ft.folder === pathChunks[pathChunks.length - 2]);

          return {
            name: nameChunks.join('.'),
            extension,
            type: fileType?.label || ''
          };

        });

        this.loading = false;
        $sub.unsubscribe();
      });
  }

  onFileSelected(file: FragmentFile): void {
    this._ref.close(file);
  }
}
