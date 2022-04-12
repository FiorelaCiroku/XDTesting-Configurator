import { Component } from '@angular/core';
import { TypedFormControl, TypedFormGroup } from '../../utils/typed-form';
import { Fragment } from '../../models';
import { ApiService } from '../../services';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'config-create-fragment',
  templateUrl: './create-fragment.component.html',
  styleUrls: ['./create-fragment.component.scss']
})
export class CreateFragmentComponent {

  saved?: boolean;
  errorMsg?: string;
  formGroup: TypedFormGroup<Fragment>;
  showAlert = false;

  constructor(private _apiService: ApiService) {
    this.formGroup = new TypedFormGroup<Fragment>({
      ontologyName: new TypedFormControl<string>(''),
      name: new TypedFormControl<string>(''),
    });

    setTimeout(() => {
      this._apiService.$loading.next(false);
    });
  }

  createFragment(): void {
    if (!this.formGroup.valid) {
      this.formGroup.markAllAsTouched();

      for (const control of Object.values(this.formGroup.controls)) {
        control.markAsDirty();
      }

      return;
    }

    this._toggleDisableControls(true);
    const data = this.formGroup.value;


    lastValueFrom(this._apiService.createFragment({name: data?.name || '', ontologyName: data?.ontologyName || ''}))
      .finally(() => {
        this._toggleDisableControls(false);
      })
      .then(result => {
        this.saved = result.success;
        this.errorMsg = result.message;
        this.showAlert = true;
      })
      .catch(err => {
        console.log(err);
        this.errorMsg = 'Error during fragment save';
        this.showAlert = true;
      });

  }

  private _toggleDisableControls(disable: boolean): void {
    for (const control of Object.values(this.formGroup.controls)) {
      if (disable) {
        control.disable();
      } else {
        control.enable();
      }
    }
  }
}
