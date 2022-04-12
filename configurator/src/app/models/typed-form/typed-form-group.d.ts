import { TypedAbstractControl } from './typed-abstract-control';

export type TypedFormGroupModel<T> = {
  [k in keyof Partial<T>]: TypedAbstractControl<T[k]>
};

