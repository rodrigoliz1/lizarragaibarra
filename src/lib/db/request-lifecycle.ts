type Factory<T extends object> = () => T;

export function createRequestScopedValue<T extends object>(
  factory: Factory<T>,
) {
  const values = new WeakMap<object, T>();

  return (requestContext: object) => {
    const existing = values.get(requestContext);
    if (existing) return existing;

    const value = factory();
    values.set(requestContext, value);
    return value;
  };
}

export function createLazyForwardingProxy<T extends object>(resolve: () => T) {
  return new Proxy({} as T, {
    get(_target, property) {
      const current = resolve();
      const value = Reflect.get(current, property, current) as unknown;

      return typeof value === "function" ? value.bind(current) : value;
    },
  });
}
