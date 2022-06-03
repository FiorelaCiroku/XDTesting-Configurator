import { Component, OnInit } from '@angular/core';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'config-text-details',
  templateUrl: './text-details.component.html',
  styleUrls: ['./text-details.component.scss']
})
export class TextDetailsComponent implements OnInit {

  notes?: string;

  constructor(private config: DynamicDialogConfig) { }

  ngOnInit(): void {
    this.notes = this.config.data.notes;
  }

}
