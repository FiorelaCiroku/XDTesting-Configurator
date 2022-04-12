import { components, operations } from '@octokit/openapi-types';

export type Repository = components['schemas']['repository'];
export type CreateOrUpdateFile = operations['repos/create-or-update-file-contents']['requestBody']['content']['application/json'];
export type CreateOrUpdateFileResponse = components['schemas']['file-commit'];
export type ContentFile = components['schemas']['content-file'];
export type ShortBranch = components['schemas']['short-branch'];
export type WorkflowRun = components['schemas']['workflow-run'];
export type WorkflowRunResponse = operations['actions/list-workflow-runs-for-repo']['responses']['200']['content']['application/json'];
