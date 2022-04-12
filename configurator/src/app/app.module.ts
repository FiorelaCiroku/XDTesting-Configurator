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
import {
  CreateFragmentComponent,
  FragmentDetailComponent,
  FragmentListComponent,
  EditFragmentTestComponent,
  LoginComponent,
  LayoutComponent,
  SpinnerComponent,
  SelectFileComponent,
  AlertComponent,
  ActionsComponent,
  SelectRepoComponent,
  TestListComponent, CreateTestComponent
} from './components';
import { ValidationFeedbackDirective, FileInputDirective } from './directives';
import { HttpInterceptorService } from './services';



@NgModule({
  declarations: [
    AppComponent,
    CreateFragmentComponent,
    FragmentDetailComponent,
    FragmentListComponent,
    EditFragmentTestComponent,
    ValidationFeedbackDirective,
    LoginComponent,
    LayoutComponent,
    FileInputDirective,
    SpinnerComponent,
    SelectFileComponent,
    AlertComponent,
    ActionsComponent,
    SelectRepoComponent,
    TestListComponent,
    CreateTestComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    TableModule,
    ReactiveFormsModule,
    AccordionModule,
    HttpClientModule,
    FormsModule,
    DialogModule,
    DynamicDialogModule,
    InputSwitchModule,
    CheckboxModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
