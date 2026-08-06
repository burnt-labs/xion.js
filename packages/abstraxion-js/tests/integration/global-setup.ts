import {
  globalSetup as runIntegrationPreflight,
  globalTeardown as runIntegrationTeardown,
} from "./setup";

export default async function setupIntegrationEnvironment() {
  await runIntegrationPreflight();

  return async () => {
    await runIntegrationTeardown();
  };
}
