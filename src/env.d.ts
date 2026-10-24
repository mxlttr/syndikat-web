interface Window {
  Sentry?: {
    captureException(error: unknown): void;
  };
}

interface ImportMetaEnv {
  readonly PUBLIC_API_URL?: string;
}

declare module "*.astro" {
  const component: import("astro/runtime/server/index.js").AstroComponentFactory;
  export default component;
}
