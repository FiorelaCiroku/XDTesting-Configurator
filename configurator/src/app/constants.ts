import { TestType, TestTypeDefinition } from './models';

export const SELECTED_REPO_KEY = 'selectedRepo';
export const SELECTED_BRANCH_KEY = 'selectedBranch';
export const TEST_TYPE_DEFINITIONS: {[k in TestType]: TestTypeDefinition} = {
  GENERAL_CONSTRAINT: {
    label: 'General Constraint',
    idPrefix: 'GC'
  },
  COMPETENCY_QUESTION: {
    label: 'Competency Question',
    idPrefix: 'CQ'
  },
  ERROR_PROVOCATION: {
    label: 'Error Provocation',
    idPrefix: 'EP'
  }
};
