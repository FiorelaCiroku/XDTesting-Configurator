export type ControlResetValue<T> = T | { value: T, disabled: boolean };

export type ControlResetObject<T> = {
  [k in keyof Partial<T>]: ControlResetValue<T[k]>
};
