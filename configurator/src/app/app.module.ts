import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import {
  CreateFragmentComponent,
  FragmentDetailComponent,
  FragmentListComponent,
  EditTestComponent,
  LoginComponent,
  LayoutComponent
} from './components';
import { ValidationFeedbackDirective } from './directives';
import { HttpInterceptorService } from './services';
import { DialogModule } from 'primeng/dialog';
import { InputSwitchModule } from 'primeng/inputswitch';
import { FileInputDirective } from './directives/file-input.directive';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectFileComponent } from './components/select-file/select-file.component';
import { AlertComponent } from './components/alert/alert.component';
import { DynamicDialogModule } from 'primeng/dynamicdialog';


@NgModule({
  declarations: [
    AppComponent,
    CreateFragmentComponent,
    FragmentDetailComponent,
    FragmentListComponent,
    EditTestComponent,
    ValidationFeedbackDirective,
    LoginComponent,
    LayoutComponent,
    FileInputDirective,
    SpinnerComponent,
    SelectFileComponent,
    AlertComponent
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
