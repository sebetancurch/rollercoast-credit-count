// `import "server-only"` throws outside a React Server Component. The modules
// under test carry it as a guard against being bundled for the browser, which
// is exactly right in the app and irrelevant in a node test — so vitest aliases
// the package to this empty module.
export {};
