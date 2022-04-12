import { Params } from '@angular/router';

export type HomeParams = Params | {
  canceled: string;
};

export type FragmentDetailParams = Params | {
  fragmentName: string;
};

export type EditTestParams = Params | {
  fragmentName: string;
  testId: string;
};
