import { captureException, init } from "@sentry/browser";

export function startSentry(options: Parameters<typeof init>[0]) {
  init(options);
  return captureException;
}
