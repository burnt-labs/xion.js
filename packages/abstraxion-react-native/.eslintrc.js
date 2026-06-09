module.exports = {
  root: true,
  extends: ["../../.eslintrc.js"],
  settings: {
    react: {
      version: "18.2",
    },
  },
  rules: {
    "no-console": "off",
    "no-nested-ternary": "off",
    "no-unnecessary-condition": "off",
    "unicorn/filename-case": "off",
    "@typescript-eslint/no-redundant-type-constituents": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-enum-comparison": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unnecessary-condition": "off",
    "react/hook-use-state": "off",
  },
  ignorePatterns: ["**/__tests__/**"],
};
