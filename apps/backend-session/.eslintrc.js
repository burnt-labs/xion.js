module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/next"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-alert": "off",
    "import/no-default-export": "off",
  },
  env: {
    node: true,
    es2022: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  ignorePatterns: ["node_modules/", "dist/", ".next/"],
};
