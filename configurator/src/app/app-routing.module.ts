import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthenticationService } from './services';
import {
  ActionsComponent,
  CreateFragmentComponent,
  TestCrudComponent, FragmentDetailComponent,
  FragmentListComponent,
  LoginComponent
} from './components/pages';
import { LayoutComponent } from './components';
import { OntologyListComponent } from './components/pages/ontology-list/ontology-list.component';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'ontologies'
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
        path: 'actions',
        component: ActionsComponent
      },
      {
        path: 'ontologies',
        component: OntologyListComponent
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
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
