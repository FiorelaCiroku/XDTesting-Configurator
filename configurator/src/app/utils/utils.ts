export function filterNullUndefined<T>(val?: T | null): val is T {
  return val !== null && val !== undefined;
}
