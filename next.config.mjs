const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/loomisdead";
export default {
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // /f/<id> style public routes live under the same basePath.
  poweredByHeader: false,
  outputFileTracingIncludes: { "/**": ["./seed/**"] },
};
