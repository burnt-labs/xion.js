module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/react"],
  rules: {
    "no-nested-ternary": "off",
    "no-unnecessary-condition": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "eslint-comments/require-description": "off",
    "no-console": "off",
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.object.name='console'][callee.property.name!=/^(error)$/]",
        message: "Unexpected property on console object was called",
      },
    ],
  },
};
