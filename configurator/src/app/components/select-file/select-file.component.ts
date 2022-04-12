import { Component, OnInit} from '@angular/core';
import { ApiService } from '../../services';
import { ContentFile } from '../../models';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'config-select-file',
  templateUrl: './select-file.component.html',
  styleUrls: ['./select-file.component.scss'],
})
export class SelectFileComponent implements OnInit {

  error?: string;
  files: ContentFile[] = [];
  loading = true;

  constructor(private _apiService: ApiService, private _ref: DynamicDialogRef, private _config: DynamicDialogConfig) {
  }

  ngOnInit(): void {
    const fragmentName = this._config.data.fragmentName;

    if (!fragmentName) {
      this.error = 'Fragment name not specified';
      return;
    }

    const $sub = this._apiService.listFiles(fragmentName)
      .subscribe((files) => {
        this.files = files;
        this.loading = false;
        $sub.unsubscribe();
      });
  }

  onFileSelected(file: ContentFile): void {
    this._ref.close(file);
  }
}
