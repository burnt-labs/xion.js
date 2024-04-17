module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/next"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "no-alert": "off",
  },
};
