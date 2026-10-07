import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "pnpm-lock.yaml",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Regla nueva de react-hooks 7: 24 efectos existentes (flags de montado, reset al abrir)
    // pendientes de refactor. Se mantiene como aviso hasta migrarlos.
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
];

export default eslintConfig;
