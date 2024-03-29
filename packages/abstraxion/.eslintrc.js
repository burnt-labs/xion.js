module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/react"],
  rules: {
    "no-nested-ternary": "off",
    "no-unnecessary-condition": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
  },
  // Don't run on the jest.config.js file
  ignorePatterns: ["jest.config.js"],
};
