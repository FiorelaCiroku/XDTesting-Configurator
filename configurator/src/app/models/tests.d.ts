export interface TestDetail {
  id: string;
  type: TestType;
  content: string;
  query?: string;
  queryFileName?: string;
  data?: string;
  dataFileName?: string;
  expectedResults?: string;
  expectedResultsFileName?: string;
}

export interface TestDetailForm extends Omit<TestDetail, 'data'> {
  queryFile?: FileList;
  dataFile?: FileList;
  expectedResultsFile?: FileList;
  data?: {
    prefixes: string;
    rows: DataSpec[]
  };
}

export interface DataSpec {
  expectedResult: boolean,
  subject: string;
  predicate: string;
  object: string;
  graph?: string;
}


export type TestType = 'GENERAL_CONSTRAINT' | 'COMPETENCY_QUESTION' | 'ERROR_PROVOCATION';
export interface TestTypeDefinition {
  label: string;
  idPrefix: string;
}
