import { FileInputFormGroup } from './file-input';

export type TestStatus = 'success' | 'running' | 'error' | 'failed';
export interface TestDetail {
  id: string;
  type: TestType;
  status: TestStatus;
  statusNotes?: string;
  issue?: string;
  reasoner?: string;
  content: string;
  query?: string;
  queryFileName?: string;
  data?: string;
  dataFileName?: string;
  expectedResults?: string;
  expectedResultsFileName?: string;
}

export interface TestDetailForm {
  type: TestType;
  reasoner?: string;
  content: string;
  query: FileInputFormGroup;
  data: FileInputFormGroup;
  expectedResults: FileInputFormGroup;
  dataContent: {
    prefixes: string;
    rows: DataSpec[]
  };
}

export interface DataSpec extends Record<string, unknown> {
  expectedResult: boolean,
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
}


export type TestType = 'INFERENCE_VERIFICATION' | 'COMPETENCY_QUESTION' | 'ERROR_PROVOCATION';
export interface TestTypeDefinition {
  label: string;
  idPrefix: string;
}
