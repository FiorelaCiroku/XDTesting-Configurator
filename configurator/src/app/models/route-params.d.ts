import { Params } from '@angular/router';

export type LoginAuthParams = Params | {
  code?: string;
};

export type FragmentDetailParams = Params | {
  fragmentName: string;
};

export type CreateTestParams = Params | {
  testId?: string;
};

export type EditFragmentTestParams = Params | {
  fragmentName: string;
  testId: string;
};
