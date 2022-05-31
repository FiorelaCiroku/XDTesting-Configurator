import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChange, ViewChild } from '@angular/core';
import { FragmentFile } from '../../../models';
import { Table } from 'primeng/table';

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


  ngOnChanges({ files }: { files: SimpleChange }): void {
    if (!files.currentValue || files.currentValue === files.previousValue) {
      return;
    }

    const temp: FragmentFile[] = [];

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

  clear(table: Table): void {
    table.clear();
    if (this.tableFilter?.nativeElement) {
      this.tableFilter.nativeElement.value = '';
    }
  }

  filterContent(e: Event): void {
    const input = e?.target as HTMLInputElement;

    if (!input) {
      return;
    }

    this.table?.filterGlobal(input.value, 'contains');
  }
}
