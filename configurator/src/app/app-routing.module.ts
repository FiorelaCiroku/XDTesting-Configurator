import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticationService } from './services';
import {
  CreateFragmentComponent,
  FragmentDetailComponent,
  FragmentListComponent,
  LoginComponent
} from './components/pages';
import { LayoutComponent } from './components';
import { OntologyListComponent } from './components/pages/ontology-list/ontology-list.component';
import { DocsComponent } from './components/pages/docs/docs.component';
import { OntologyDocsComponent } from './components/pages/docs/ontology-docs.component';
import { FragmentDocsComponent } from './components/pages/docs/fragment-docs.component';
import { TestDocsComponent } from './components/pages/docs/test-docs.component';
import { DashboardComponent } from './components/pages/dashboard/dashboard.component';
import { TestCrudComponent } from './components/pages/test-crud';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard'
  },
  {
    path: 'login',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: 'auth',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthenticationService],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'ontologies',
        component: OntologyListComponent
      },
      {
        path: 'docs',
        children: [
          {
            path: '',
            component: DocsComponent
          },
          {
            path: 'ontology',
            component: OntologyDocsComponent
          },
          {
            path: 'fragment',
            component: FragmentDocsComponent
          },
          {
            path: 'test',
            component: TestDocsComponent
          }
        ]

      },
      {
        path: 'fragments',
        children: [
          {
            path: '',
            component: FragmentListComponent,
          },
          {
            path: 'create',
            component: CreateFragmentComponent,
            pathMatch: 'full'
          },
          {
            path: ':fragmentName',
            component: FragmentDetailComponent
          },
          {
            path: ':fragmentName/create-test',
            component: TestCrudComponent
          },
          {
            path: ':fragmentName/edit-test/:testId',
            component: TestCrudComponent
          },
        ],
      }
    ],
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
