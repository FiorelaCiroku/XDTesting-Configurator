import { TypedFormGroup } from '../utils/typed-form';
import { FileTypes } from './file-types';

export interface FileInputFormGroup extends Record<string, unknown>{
  content?: string;
  file: FileList;
  fileName: string;
}

export interface FileInputFormGroupSpec {
  label: string;
  formGroup: TypedFormGroup<FileInputFormGroup>
  placeholder?: string;
  fileType: FileTypes
}
