import { TestType, TestTypeDefinition } from './models';

export const SELECTED_REPO_KEY = 'selectedRepo';
export const SELECTED_BRANCH_KEY = 'selectedBranch';
export const SELECTED_TESTING_TYPE_KEY = 'selectedTestingType';
export const TEST_TYPE_DEFINITIONS: {[k in TestType]: TestTypeDefinition} = {
  GENERAL_CONSTRAINT: {
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
