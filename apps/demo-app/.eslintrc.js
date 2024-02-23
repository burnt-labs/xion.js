module.exports = {
  root: true,
  extends: ["@burnt-labs/eslint-config-custom/next"],
  rules: {
    "@typescript-eslint/no-misused-promises": [
      2,
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],
  },
};
