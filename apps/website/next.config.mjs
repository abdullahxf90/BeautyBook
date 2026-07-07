/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Only pull in Sentry's build integration (and ship the client SDK) when a DSN
// is configured at build time. With no DSN the bundle stays lean — no ~73kB of
// dormant SDK on every page.
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

let config = nextConfig;
if (sentryDsn) {
  const { withSentryConfig } = await import("@sentry/nextjs");
  config = withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    disableLogger: true,
    widenClientFileUpload: true,
  });
}

export default config;
