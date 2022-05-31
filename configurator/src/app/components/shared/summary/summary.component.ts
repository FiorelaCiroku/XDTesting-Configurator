import { Component, Input } from '@angular/core';

export interface Summary {
  label: string;
  data: string;
}


@Component({
  selector: 'config-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent {

  @Input('data') summaryData: Summary[] = [];

}
