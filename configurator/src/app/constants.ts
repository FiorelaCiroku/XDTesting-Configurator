import { FileTypeSpecs, TestType, TestTypeDefinition } from './models';

export const SELECTED_REPO_KEY = 'selectedRepo';
export const SELECTED_BRANCH_KEY = 'selectedBranch';
export const TEST_TYPE_DEFINITIONS: {[k in TestType]: TestTypeDefinition} = {
  INFERENCE_VERIFICATION: {
    label: 'Inference Verification Test',
    idPrefix: 'IV'
  },
  COMPETENCY_QUESTION: {
    label: 'Competency Question Test',
    idPrefix: 'CQ'
  },
  ERROR_PROVOCATION: {
    label: 'Error Provocation Test',
    idPrefix: 'EP'
  }
};

export const FILE_TYPES: FileTypeSpecs = {
  query: { folder: 'queries', label: 'Query' },
  expectedResults: { folder: 'expectedResults', label: 'Expected Results' },
  dataset: { folder: 'datasets', label: 'Sample Dataset' }
};
