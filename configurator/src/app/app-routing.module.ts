import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {
  ActionsComponent,
  CreateFragmentComponent,
  FragmentDetailComponent,
  EditFragmentTestComponent,
  FragmentListComponent, LoginComponent, LayoutComponent, TestListComponent, CreateTestComponent
} from './components';
import { AuthenticationService, TestingTypeGuardService } from './services';

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
        path: 'fragments',
        canActivate: [TestingTypeGuardService],
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
            component: EditFragmentTestComponent
          },
          {
            path: ':fragmentName/edit-test/:testId',
            component: EditFragmentTestComponent
          },
        ],
      },
      {
        path: 'tests',
        canActivate: [TestingTypeGuardService],
        children: [
          {
            path: '',
            component: TestListComponent
          },
          {
            path: 'create',
            component: CreateTestComponent
          },
          {
            path: 'edit/:testId',
            component: CreateTestComponent
          }
        ]
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
