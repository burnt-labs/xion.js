import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  preset: "ts-jest",
  moduleNameMapper: {
    "@/hooks": "<rootDir>/hooks",
    "@/utils": "<rootDir>/utils",
    "@/components/(.*)": "<rootDir>/components/$1",
  },
};

export default createJestConfig(config);
