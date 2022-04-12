import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  CreateFragmentComponent,
  FragmentDetailComponent,
  EditTestComponent,
  FragmentListComponent, LoginComponent, LayoutComponent
} from './components';
import { AuthenticationService } from './services';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'fragments'
  },
  {
    path: 'login',
    component: LoginComponent,
    pathMatch: 'full'
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthenticationService],
    children: [
      {
        path: 'fragments',
        component: FragmentListComponent,
      },
      {
        path: 'fragments/create',
        component: CreateFragmentComponent,
        pathMatch: 'full'
      },
      {
        path: 'fragments/:fragmentName',
        component: FragmentDetailComponent
      },
      {
        path: 'fragments/:fragmentName/create-test',
        component: EditTestComponent
      },
      {
        path: 'fragments/:fragmentName/edit-test/:testId',
        component: EditTestComponent
      },
    ]
  },
  {
    path: '**',
    redirectTo: '/fragments'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
