import { TestStatus, TestType } from './tests';

export type StatusStats = {[k in TestStatus]: number};
export type TestTypeStats = {[k in TestType]: number};
