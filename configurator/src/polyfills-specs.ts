import './polyfills';

// monkey-patch ES6 import
// see https://github.com/jasmine/jasmine/issues/1414#issuecomment-915036017
const { defineProperty } = Object;
Object.defineProperty = function<T>(object: T, name: PropertyKey, meta: PropertyDescriptor): T {
  if (meta.get && !meta.configurable) {
    // it might be an ES6 exports object
    return defineProperty(object, name, {
      ...meta,
      configurable: true,
    });
  }

  return defineProperty(object, name, meta);
};
