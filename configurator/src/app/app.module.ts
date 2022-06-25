import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AccordionModule } from 'primeng/accordion';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { DynamicDialogModule } from 'primeng/dynamicdialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { TableModule } from 'primeng/table';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutComponent } from './components';
import { ValidationFeedbackDirective, FileInputDirective } from './directives';
import { HttpInterceptorService } from './services';
import { AlertComponent } from './components/utils';
import {
  SelectFileComponent,
  SelectRepoComponent,
  UploadFragmentFileComponent,
  UploadOntologyComponent
} from './components/modals';
import {
  CreateFragmentComponent,
  TestCrudComponent, FragmentDetailComponent,
  FragmentListComponent,
  LoginComponent
} from './components/pages';
import { FilesTableComponent } from './components/shared/files-table/files-table.component';
import { FileInputComponent } from './components/pages/test-crud/file-input/file-input.component';
import { SummaryComponent } from './components/shared/summary/summary.component';
import { InputTextModule } from 'primeng/inputtext';
import { DataInputComponent } from './components/pages/test-crud/data-input/data-input.component';
import { OntologyListComponent } from './components/pages/ontology-list/ontology-list.component';
import { DocsComponent } from './components/pages/docs/docs.component';
import { OntologyDocsComponent } from './components/pages/docs/ontology-docs.component';
import { FragmentDocsComponent } from './components/pages/docs/fragment-docs.component';
import { TestDocsComponent } from './components/pages/docs/test-docs.component';
import { TooltipModule } from 'primeng/tooltip';
import { MultiSelectModule } from 'primeng/multiselect';
import { TextDetailsComponent } from './components/modals/text-details/text-details.component';
import { DashboardComponent } from './components/pages/dashboard/dashboard.component';
import { SelectOntologyComponent } from './components/modals/select-ontology/select-ontology.component';
import { NgChartsModule } from 'ng2-charts';


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
    {provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true},
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
