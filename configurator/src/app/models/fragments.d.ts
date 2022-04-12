import { TestDetail } from './tests';

export interface Fragment {
  name: string;
  ontologyName: string;
  tests?: TestDetail[];
}

