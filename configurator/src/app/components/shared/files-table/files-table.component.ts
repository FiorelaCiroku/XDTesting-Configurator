import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChange, ViewChild } from '@angular/core';
import { FileTypeSpecs, FragmentFile } from '../../../models';
import { Table } from 'primeng/table';
import { FILE_TYPES, SELECTED_BRANCH_KEY, SELECTED_REPO_KEY } from '../../../constants';

@Component({
  selector: 'config-files-table',
  templateUrl: './files-table.component.html',
  styleUrls: ['./files-table.component.scss']
})
export class FilesTableComponent implements OnChanges {

  @Input() files: FragmentFile[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No data uploaded yet';

  @Output() onRowClicked = new EventEmitter<FragmentFile>();


  @ViewChild('table', {read: Table}) table?: Table;
  @ViewChild('tableFilter', {read: ElementRef}) tableFilter?: ElementRef<HTMLInputElement>;

  fileTypeSpecs: FileTypeSpecs = FILE_TYPES;

  private readonly _repository: string | null;
  private readonly _branch: string | null;


  constructor() {
    this._repository = localStorage.getItem(SELECTED_REPO_KEY);
    this._branch = localStorage.getItem(SELECTED_BRANCH_KEY);
  }


  // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
  // for destructuring syntax in parameter list
  ngOnChanges({ files }: { files?: SimpleChange }): void {
    if (!files || !files.currentValue || files.currentValue === files.previousValue) {
      return;
    }

    const temp: FragmentFile[] = [];

    // for each provided file, try to get the extension if not specified
    for (const f of this.files) {
      let extension = f.extension;

      if (!extension) {
        const chunks = f.name.split('.');
        extension = chunks.length > 1 ? chunks[chunks.length - 1] : '';
      }

      temp.push({
        ...f,
        extension
      });
    }

    this.files = temp;
  }

  /**
   * Builds an URL to download the file
   * @param file File to download
   * @returns URL to navigate to download the file
   */
  downloadUrl(file: FragmentFile): string {
    if (!this._branch && !this._repository) {
      return '';
    }

    return `https://raw.githubusercontent.com/${this._repository}/${this._branch}/${file.path}`;
  }

  /**
   * Clear table's filters
   * @param table Table reference to clear
   */
  clear(table: Table): void {
    table.clear();
    if (this.tableFilter?.nativeElement) {
      this.tableFilter.nativeElement.value = '';
    }
  }

  /**
   * Filter table based on provided text. Acts as a free-text search field
   * meaning that it will be searched along all the columns
   * @param e KeyboardEvent associated to a input element
   */
  filterContent(e: Event): void {
    const input = e?.target as HTMLInputElement;

    if (!input) {
      return;
    }

    this.table?.filterGlobal(input.value, 'contains');
  }
}
