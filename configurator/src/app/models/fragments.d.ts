import { TestDetail } from './tests';

export interface Fragment {
  name: string;
  ontologyName: string;
  fileName?: string;
  tests?: TestDetail[];
}

export interface FragmentForm {
  name: string;
  ontologyName: string;
  file: FileList;
}

export interface FragmentFile {
  path: string;
  name: string;
  extension?: string;
  type: string;
}

