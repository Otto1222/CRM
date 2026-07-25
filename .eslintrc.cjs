/**
 * ESLint konfiguráció (ESLint 8, klasszikus formátum).
 *
 * A meglévő, nagy kódbázis miatt a stílusszabályok többsége "warn" vagy
 * kikapcsolt – a cél a hibák (pl. nem definiált változó) kiszűrése anélkül,
 * hogy a lint elárasztaná a fejlesztőt a régi kódból származó zajjal.
 * A build (vite) ettől függetlenül változatlanul működik.
 */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "18" },
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
  ],
  plugins: ["react", "react-hooks"],
  rules: {
    // Új JSX transform – nem kell React import a scope-hoz.
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    // Legacy zaj csökkentése:
    "no-unused-vars": "warn",
    "no-empty": "warn",
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/rules-of-hooks": "error",
  },
  ignorePatterns: [
    "dist",
    "node_modules",
    "appsscript",
    "api",
    "*.mjs",
  ],
};
