// The OpenNext build creates this module before Wrangler bundles the Worker.
// @ts-expect-error Generated deployment entry point.
import openNextWorker from "./.open-next/worker.js";

import { disconnectRequestDatabaseClient } from "./src/lib/db/request-lifecycle";

type WorkerExecutionContext = {
  waitUntil(promise: Promise<unknown>): void;
};

function responseWithDatabaseCleanup(
  response: Response,
  context: WorkerExecutionContext,
) {
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    context.waitUntil(disconnectRequestDatabaseClient(context));
  };

  if (!response.body) {
    release();
    return response;
  }

  const reader = response.body.getReader();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          release();
          controller.close();
          return;
        }
        controller.enqueue(value);
      } catch (error) {
        release();
        controller.error(error);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  });

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

const worker = {
  async fetch(
    request: Request,
    environment: unknown,
    context: WorkerExecutionContext,
  ) {
    try {
      const response = await openNextWorker.fetch(
        request,
        environment,
        context,
      );
      return responseWithDatabaseCleanup(response, context);
    } catch (error) {
      context.waitUntil(disconnectRequestDatabaseClient(context));
      throw error;
    }
  },
};

export default worker;
