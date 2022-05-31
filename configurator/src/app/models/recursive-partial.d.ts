type primitive = string | number | boolean | undefined | null;
export type RecursivePartial<T> = {
  [k in keyof T]?: T[k] extends primitive ? T[k] : RecursivePartial<T[k]>;
};
