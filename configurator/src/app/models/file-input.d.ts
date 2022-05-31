import { TypedFormGroup } from '../utils/typed-form';

export interface FileInputFormGroup extends Record<string, unknown>{
  content?: string;
  file: FileList;
  fileName: string;
}

export interface FileInputFormGroupSpec {
  label: string;
  formGroup: TypedFormGroup<FileInputFormGroup>
}
