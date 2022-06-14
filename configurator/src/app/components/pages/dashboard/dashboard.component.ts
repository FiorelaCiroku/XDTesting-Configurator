import { Component } from '@angular/core';
import { ApiService } from '../../../services';
import { Fragment, StatusStats, TestDetail, TestStatus, TestTypeStats } from '../../../models';
import { forkJoin, lastValueFrom } from 'rxjs';
import { ChartData, ChartDataset } from 'chart.js';
import { TEST_TYPE_DEFINITIONS } from '../../../constants';

@Component({
  selector: 'config-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  ontologies = 0;
  fragments = 0;

  statusStats: StatusStats;

  colors: {[k in TestStatus]: string} = {
    success: 'success',
    error: 'warning',
    failed: 'danger',
    running: 'secondary',
  };

  icons: {[k in TestStatus]: string} = {
    failed: 'fa-solid fa-circle-xmark text-danger',
    success: 'fa-solid fa-circle-check text-success',
    error: 'fa-solid fa-triangle-exclamation text-warning',
    running: 'fa-solid fa-rotate fa-spin text-secondary',
  };

  lineData?: ChartData;



  constructor(private readonly apiService: ApiService) {
    this.statusStats = DashboardComponent._getStatusStats();

    lastValueFrom(forkJoin([apiService.getFragments(), apiService.listOntologies()]))
      .then(([fragments, ontologies]) => {
        this._initStats(fragments);
        this.fragments = fragments.length;
        this.ontologies = ontologies.length;
      });

  }

  private static _getStatusStats(): StatusStats {
    return {
      running: 0,
      success: 0,
      error: 0,
      failed: 0,
    };
  }

  private _initStats(fragments: Fragment[]): void {
    const ontologyStats: { [k: string]: TestTypeStats } = {};
    this.fragments = fragments.length;

    for (const fragment of fragments) {
      if (!(fragment.ontologyName in ontologyStats)) {
        ontologyStats[fragment.ontologyName] = {
          INFERENCE_VERIFICATION: 0,
          ERROR_PROVOCATION: 0,
          COMPETENCY_QUESTION: 0
        };
      }

      const tests: TestDetail[] = fragment.tests || [];

      for (const test of tests) {
        this.statusStats[test.status] += 1;
        ontologyStats[fragment.ontologyName][test.type] += 1;
      }
    }

    this.ontologies = Object.values(ontologyStats).length;
    const datasets: ChartDataset[] = [];

    for (const [ontology, stats] of Object.entries(ontologyStats)) {
      datasets.push({
        label: ontology,
        fill: false,
        data: [
          stats.COMPETENCY_QUESTION,
          stats.INFERENCE_VERIFICATION,
          stats.ERROR_PROVOCATION,
        ]
      });
    }

    this.lineData = {
      labels: [
        TEST_TYPE_DEFINITIONS.COMPETENCY_QUESTION.idPrefix,
        TEST_TYPE_DEFINITIONS.INFERENCE_VERIFICATION.idPrefix,
        TEST_TYPE_DEFINITIONS.ERROR_PROVOCATION.idPrefix,
      ],
      datasets
    };
  }

}
