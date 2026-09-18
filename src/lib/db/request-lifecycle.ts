type Factory<T extends object> = () => T;

type Disconnectable = {
  $disconnect(): Promise<void>;
};

const requestDatabaseClientsKey = Symbol.for(
  "lizarragaibarra.database.request-clients",
);

type DatabaseClientRegistry = WeakMap<object, Disconnectable>;

function requestDatabaseClients() {
  const scope = globalThis as typeof globalThis & {
    [requestDatabaseClientsKey]?: DatabaseClientRegistry;
  };

  scope[requestDatabaseClientsKey] ??= new WeakMap<object, Disconnectable>();
  return scope[requestDatabaseClientsKey];
}

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

export function getRequestDatabaseClient<T extends Disconnectable>(
  requestContext: object,
  factory: Factory<T>,
) {
  const clients = requestDatabaseClients();
  const existing = clients.get(requestContext);
  if (existing) return existing as T;

  const client = factory();
  clients.set(requestContext, client);
  return client;
}

export async function disconnectRequestDatabaseClient(requestContext: object) {
  const clients = requestDatabaseClients();
  const client = clients.get(requestContext);
  if (!client) return;

  clients.delete(requestContext);
  await client.$disconnect();
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
