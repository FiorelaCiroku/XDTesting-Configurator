import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { NgChartsModule } from 'ng2-charts';

import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutComponent } from './components';
import { ValidationFeedbackDirective, FileInputDirective } from './directives';
import { HttpInterceptorService } from './services';
import { AlertComponent } from './components/utils';
import {
  SelectFileComponent,
  SelectOntologyComponent,
  SelectRepoComponent,
  TextDetailsComponent,
  UploadFragmentFileComponent,
  UploadOntologyComponent
} from './components/modals';
import {
  CreateFragmentComponent,
  FragmentDetailComponent,
  FragmentListComponent,
  LoginComponent,
  OntologyListComponent,
  DocsComponent,
  DashboardComponent,
} from './components/pages';
import { TestCrudComponent, FileInputComponent, DataInputComponent } from './components/pages/test-crud';
import { OntologyDocsComponent, FragmentDocsComponent, TestDocsComponent, } from './components/pages/docs';
import { FilesTableComponent, SummaryComponent } from './components/shared';


@NgModule({
  declarations: [
    AppComponent,
    LayoutComponent,

    // Pages
    CreateFragmentComponent,
    TestCrudComponent,
    FragmentDetailComponent,
    FragmentListComponent,
    ValidationFeedbackDirective,
    LoginComponent,
    FilesTableComponent,
    FileInputComponent,
    SummaryComponent,
    DataInputComponent,
    UploadFragmentFileComponent,
    OntologyListComponent,
    UploadOntologyComponent,
    DocsComponent,
    OntologyDocsComponent,

    // Modals
    SelectFileComponent,
    SelectRepoComponent,

    // Utils
    AlertComponent,

    // Directives
    FileInputDirective,
    FragmentDocsComponent,
    DashboardComponent,
    TestDocsComponent,
    TextDetailsComponent,
    SelectOntologyComponent
  ],
  imports: [
    // Angular
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule,

    // Application
    AppRoutingModule,

    // PrimeNG
    AccordionModule,
    CheckboxModule,
    DialogModule,
    DynamicDialogModule,
    InputSwitchModule,
    InputTextModule,
    TableModule,
    TooltipModule,
    MultiSelectModule,
    NgChartsModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
