import { Component } from '@angular/core';
import { ApiService } from '../../services';
import { WorkflowRun } from '../../models';
import * as moment from 'moment';

@Component({
  selector: 'config-actions',
  templateUrl: './actions.component.html',
  styleUrls: ['./actions.component.scss']
})
export class ActionsComponent {

  workflowRuns: WorkflowRun[] = [];

  constructor(private _apiService: ApiService) {
    const $sub = this._apiService.listWorkflows()
      .subscribe(res => {
        this.workflowRuns = res.workflow_runs;
        this._apiService.$loading.next(false);
        $sub.unsubscribe();
      });
  }

  getFormattedDate(time: string): string {
    if (!time) {
      return '';
    }

    return moment(time).format('DD/MM/YYYY HH:mm');
  }

  getTimeSpan(start: string, end: string): string {
    const startMoment = moment(start);
    const endMoment = moment(end);

    const span = moment.duration(endMoment.diff(startMoment));

    return (span.hours() > 0 ? (span.hours() + 'h ') : '') +
      (span.minutes() > 0 ? (span.minutes() + 'm ') : '') +
      (span.seconds() > 0 ? (span.seconds() + 's ') : '');
  }

  openRun(url: string): void {
    window.location.replace(url);
  }
}
