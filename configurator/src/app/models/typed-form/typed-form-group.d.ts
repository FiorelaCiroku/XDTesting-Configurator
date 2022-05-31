import { TypedControl } from './typed-abstract-control';

export type TypedFormGroupModel<T> = {
  [k in keyof T]: TypedControl<T[k]>
};
