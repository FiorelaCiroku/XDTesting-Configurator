import { TestDetail, TestingType } from './tests';
import { Fragment } from './fragments';

export interface UserInput {
  type: TestingType;
  tests?: TestDetail[];
  fragments?: Fragment[];
}
