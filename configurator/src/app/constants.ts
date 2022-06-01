import { FileTypeSpecs, TestType, TestTypeDefinition } from './models';

export const SELECTED_REPO_KEY = 'selectedRepo';
export const SELECTED_BRANCH_KEY = 'selectedBranch';
export const TEST_TYPE_DEFINITIONS: {[k in TestType]: TestTypeDefinition} = {
  INFERENCE_VERIFICATION: {
    label: 'Inference Verification Test',
    idPrefix: 'IV'
  },
  COMPETENCY_QUESTION: {
    label: 'Competency Question Verification Test',
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

export const REASONERS: string[] = [
  'hermiT 1.4.3.456',
  'Pellet',
  'ELK 0.4.3',
  'FaCT++ 1.6.5',
  'Masto DL-Lite Reasoner',
  'Ontop 4.1.0',
  'jcel'
];
