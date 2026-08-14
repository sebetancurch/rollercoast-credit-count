// eslint-config-next 16 ships flat configs directly — no FlatCompat wrapper.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // Scratch state the Supabase CLI writes while the local stack runs — not
      // ours, already gitignored, and minified.
      "supabase/.temp/**",
      "supabase/.branches/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
