module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/react"],
  rules: {
    "no-nested-ternary": "off",
    "no-unnecessary-condition": "off",
    "@typescript-eslint/no-floating-promises": "off",
  },
};
