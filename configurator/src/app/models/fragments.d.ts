import { TestDetail } from './tests';

export interface Fragment {
  name: string;
  ontologyName: string;
  tests?: TestDetail[];
}

export interface FragmentFile {
  name: string;
  extension?: string;
  type: string;
}

