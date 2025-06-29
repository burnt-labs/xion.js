import { GasPrice } from "@cosmjs/stargate";
import { CosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { fetchConfig } from "@burnt-labs/constants";
import type {
  ContractGrantDescription,
  DecodedReadableAuthorization,
  GrantsResponse,
  SpendLimit,
} from "@/types";
import { GranteeSignerClient } from "./GranteeSignerClient";
import { SignArbSecp256k1HdWallet } from "./SignArbSecp256k1HdWallet";
import type { RedirectStrategy, StorageStrategy } from "./types/strategyTypes";
import {
  compareBankGrants,
  compareChainGrantsToTreasuryGrants,
  compareContractGrants,
  compareStakeGrants,
  decodeAuthorization,
  fetchChainGrantsABCI,
  getTreasuryContractConfigsByTypeUrl,
  getTreasuryContractTypeUrls,
} from "@/utils/grant";

export class AbstraxionAuth {
  // Config
  private rpcUrl?: string;
  grantContracts?: ContractGrantDescription[];
  stake?: boolean;
  bank?: SpendLimit[];
  callbackUrl?: string;
  treasury?: string;

  // Signer
  private client?: GranteeSignerClient;
  private cosmwasmQueryClient?: CosmWasmClient;

  // Accounts
  abstractAccount?: SignArbSecp256k1HdWallet;

  // State
  private isLoginInProgress = false;
  isLoggedIn = false;
  authStateChangeSubscribers: ((isLoggedIn: boolean) => void)[] = [];

  /**
   * Creates an instance of the AbstraxionAuth class.
   */
  constructor(
    private storageStrategy: StorageStrategy,
    private redirectStrategy: RedirectStrategy,
  ) {
    // Specific to mobile flow
    if (this.redirectStrategy.onRedirectComplete) {
      this.redirectStrategy.onRedirectComplete(async (params) => {
        if (params.granter) {
          await this.setGranter(params.granter);
          await this.login();
        }
      });
    }
  }

  /**
   * Updates AbstraxionAuth instance with user config
   *
   * @param {string} rpc - The RPC URL used for communication with the blockchain.
   * @param {ContractGrantDescription[]} [grantContracts] - Contracts for granting permissions.
   * @param {boolean} [stake] - Indicates whether staking is enabled.
   * @param {SpendLimit[]} [bank] - The spend limits for the user.
   * @param {string} callbackUrl - preferred callback url to override default
   * @param {string} treasury - treasury contract instance address
   */
  configureAbstraxionInstance(
    rpc: string,
    grantContracts?: ContractGrantDescription[],
    stake?: boolean,
    bank?: SpendLimit[],
    callbackUrl?: string,
    treasury?: string,
  ) {
    this.rpcUrl = rpc;
    this.grantContracts = grantContracts;
    this.stake = stake;
    this.bank = bank;
    this.callbackUrl = callbackUrl;
    this.treasury = treasury;
  }

  /**
   * Subscribes to changes in authentication state.
   * When the authentication state changes, the provided callback function is invoked
   * with the new authentication state (isLoggedIn).
   * Returns an unsubscribe function that can be called to remove the subscription.
   *
   * @param {function} callback - A function to be invoked when the authentication state changes.
   *                             Receives a single parameter, isLoggedIn, indicating whether the user is logged in.
   *                             The callback should accept a boolean parameter.
   * @returns {function} - A function that, when called, removes the subscription to authentication state changes.
   *                      This function should be invoked to clean up the subscription when no longer needed.
   */
  subscribeToAuthStateChange(callback: (isLoggedIn: boolean) => void) {
    this.authStateChangeSubscribers.push(callback);
    return () => {
      const index = this.authStateChangeSubscribers.indexOf(callback);
      if (index !== -1) {
        this.authStateChangeSubscribers.splice(index, 1);
      }
    };
  }

  /**
   * Triggers a change in authentication state and notifies all subscribers.
   *
   * @param {boolean} isLoggedIn - The new authentication state, indicating whether the user is logged in.
   */
  private triggerAuthStateChange(isLoggedIn: boolean): void {
    this.isLoggedIn = isLoggedIn;
    this.authStateChangeSubscribers.forEach((callback) => callback(isLoggedIn));
  }

  /**
   * Get the account address of the granter from persisted state.
   *
   * @returns {string} The account address of the granter wallet (XION Meta Account).
   */
  async getGranter(): Promise<string> {
    const granterAddress = await this.storageStrategy.getItem(
      "xion-authz-granter-account",
    );
    if (
      !granterAddress ||
      granterAddress === undefined ||
      granterAddress === "undefined"
    ) {
      return "";
    }
    return granterAddress;
  }

  /**
   * Remove persisted instance of granter account.
   */
  private async removeGranterAddress(): Promise<void> {
    await this.storageStrategy.removeItem("xion-authz-granter-account");
  }

  /**
   * Set a persisted instance for granter account.
   *
   * @param {string} address - account address of the granter wallet (XION Meta Account).
   */
  private async setGranter(address: string): Promise<void> {
    await this.storageStrategy.setItem("xion-authz-granter-account", address);
  }

  /**
   * Get temp keypair from persisted state.
   */
  async getLocalKeypair(): Promise<SignArbSecp256k1HdWallet | undefined> {
    const localKeypair = await this.storageStrategy.getItem(
      "xion-authz-temp-account",
    );
    if (!localKeypair) {
      return undefined;
    }
    return await SignArbSecp256k1HdWallet.deserialize(
      localKeypair,
      "abstraxion",
    );
  }

  /**
   * Generate a new temp keypair and store in persisted state.
   */
  async generateAndStoreTempAccount(): Promise<SignArbSecp256k1HdWallet> {
    const keypair = await SignArbSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });

    const serializedKeypair = await keypair.serialize("abstraxion");
    await this.storageStrategy.setItem(
      "xion-authz-temp-account",
      serializedKeypair,
    );

    await this.removeGranterAddress(); // Prevent multiple truth issue

    return keypair;
  }

  /**
   * Get keypair account address.
   */
  async getKeypairAddress(): Promise<string> {
    const keypair = await this.getLocalKeypair();
    if (!keypair) return "";
    const accounts = await keypair.getAccounts();
    const address = accounts[0].address;
    return address;
  }

  /**
   * Get GranteeSignerClient for the temp keypair.
   */
  async getSigner(): Promise<GranteeSignerClient> {
    try {
      if (this.client) {
        return this.client;
      }

      if (!this.rpcUrl) {
        throw new Error("Configuration not initialized");
      }

      if (!this.abstractAccount) {
        throw new Error("No account found.");
      }

      const granterAddress = await this.getGranter();

      if (!granterAddress) {
        throw new Error("No granter found.");
      }

      const granteeAddress = await this.abstractAccount
        .getAccounts()
        .then((accounts: any) => {
          if (accounts.length === 0) {
            throw new Error("No account found.");
          }
          return accounts[0].address;
        });

      const directClient = await GranteeSignerClient.connectWithSigner(
        this.rpcUrl,
        this.abstractAccount,
        {
          gasPrice: GasPrice.fromString("0uxion"),
          granterAddress,
          granteeAddress,
          treasuryAddress: this.treasury,
        },
      );

      this.client = directClient;
      return directClient;
    } catch (error) {
      console.warn("Something went wrong getting signer: ", error);
      this.client = undefined;
      throw error;
    }
  }

  /**
   * Get non-signing CosmWasmClient
   * @returns {Promise<CosmWasmClient>} A Promise that resolves to a CosmWasmClient
   * @throws {Error} If the rpcUrl is missing, or if there is a network issue.
   */
  async getCosmWasmClient(): Promise<CosmWasmClient> {
    try {
      if (this.cosmwasmQueryClient) {
        return this.cosmwasmQueryClient;
      }

      if (!this.rpcUrl) {
        throw new Error("Configuration not initialized");
      }

      const cosmwasmClient = await CosmWasmClient.connect(this.rpcUrl || "");

      this.cosmwasmQueryClient = cosmwasmClient;
      return cosmwasmClient;
    } catch (error) {
      console.warn("Something went wrong getting cosmwasm client: ", error);
      this.cosmwasmQueryClient = undefined;
      throw error;
    }
  }

  /**
   * Get dashboard url and redirect in order to issue claim with XION meta account for local keypair.
   */
  async redirectToDashboard() {
    try {
      if (!this.rpcUrl) {
        throw new Error("AbstraxionAuth needs to be configured.");
      }
      const userAddress = await this.getKeypairAddress();
      const { dashboardUrl } = await fetchConfig(this.rpcUrl);
      await this.configureUrlAndRedirect(dashboardUrl, userAddress);
    } catch (error) {
      console.warn(
        "Something went wrong trying to redirect to XION dashboard: ",
        error,
      );
    }
  }

  /**
   * Configure URL and redirect page
   */
  private async configureUrlAndRedirect(
    dashboardUrl: string,
    userAddress: string,
  ): Promise<void> {
    if (typeof window !== "undefined") {
      const currentUrl = this.callbackUrl || window.location.href;
      const urlParams = new URLSearchParams();

      if (this.treasury) {
        urlParams.set("treasury", this.treasury);
      }

      if (this.bank) {
        urlParams.set("bank", JSON.stringify(this.bank));
      }

      if (this.stake) {
        urlParams.set("stake", "true");
      }

      if (this.grantContracts) {
        urlParams.set("contracts", JSON.stringify(this.grantContracts));
      }

      urlParams.set("grantee", userAddress);
      urlParams.set("redirect_uri", currentUrl);

      const queryString = urlParams.toString();
      await this.redirectStrategy.redirect(`${dashboardUrl}?${queryString}`);
    } else {
      console.warn("Window not defined. Cannot redirect to dashboard");
    }
  }

  /**
   * Compares a GrantsResponse object to the legacy configuration stored in the instance.
   * Validates the presence and attributes of grants for each authorization type.
   *
   * @param {GrantsResponse} grantsResponse - The grants response object containing the chain grants.
   * @returns {boolean} - Returns `true` if the grants match the expected configuration; otherwise, `false`.
   */
  compareGrantsToLegacyConfig(grantsResponse: GrantsResponse): boolean {
    const { grants } = grantsResponse;

    return (
      compareContractGrants(grants, this.grantContracts) &&
      compareStakeGrants(grants, this.stake) &&
      compareBankGrants(grants, this.bank)
    );
  }

  /**
   * Compares treasury grant configurations with the grants on-chain to ensure they match.
   *
   * @param {GrantsResponse} grantsResponse - The grants currently existing on-chain.
   * @returns {Promise<boolean>} - Returns a promise that resolves to `true` if all treasury grants match chain grants; otherwise, `false`.
   * @throws {Error} - Throws an error if the treasury contract is missing.
   */
  async compareGrantsToTreasury(
    grantsResponse: GrantsResponse,
  ): Promise<boolean> {
    if (!this.treasury) {
      throw new Error("Missing treasury");
    }

    const cosmwasmClient =
      this.cosmwasmQueryClient || (await this.getCosmWasmClient());

    const treasuryTypeUrls = await getTreasuryContractTypeUrls(
      cosmwasmClient,
      this.treasury,
    );
    const treasuryGrantConfigs = await getTreasuryContractConfigsByTypeUrl(
      cosmwasmClient,
      this.treasury,
      treasuryTypeUrls,
    );

    const decodedTreasuryConfigs: DecodedReadableAuthorization[] =
      treasuryGrantConfigs.map((treasuryGrantConfig) => {
        return decodeAuthorization(
          treasuryGrantConfig.authorization.type_url,
          treasuryGrantConfig.authorization.value,
        );
      });

    const decodedChainConfigs: DecodedReadableAuthorization[] =
      grantsResponse.grants.map((grantResponse) => {
        return decodeAuthorization(
          grantResponse.authorization.typeUrl,
          grantResponse.authorization.value,
        );
      });

    return compareChainGrantsToTreasuryGrants(
      decodedChainConfigs,
      decodedTreasuryConfigs,
    );
  }

  /**
   * Poll for grants issued to a grantee from a granter.
   *
   * @param {string} grantee - The address of the grantee.
   * @param {string | null} granter - The address of the granter, or null if not available.
   * @returns {Promise<boolean>} A Promise that resolves to true if grants are found, otherwise false.
   * @throws {Error} If the grantee or granter address is invalid, or if maximum retries are exceeded.
   */
  async pollForGrants(
    grantee: string,
    granter: string | null,
  ): Promise<boolean> {
    if (!this.rpcUrl) {
      throw new Error("AbstraxionAuth needs to be configured.");
    }
    if (!grantee) {
      throw new Error("No keypair address");
    }
    if (!granter) {
      throw new Error("No granter address");
    }

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        const data = await fetchChainGrantsABCI(grantee, granter, this.rpcUrl);

        if (data.grants.length === 0) {
          console.warn("No grants found.");
          return false;
        }

        // Check expiration for each grant
        const currentTime = new Date().toISOString();
        const validGrant = data.grants.some((grant) => {
          const { expiration } = grant;
          return !expiration || expiration > currentTime;
        });

        let isValid: boolean;
        if (this.treasury) {
          isValid = await this.compareGrantsToTreasury(data);
        } else {
          isValid = this.compareGrantsToLegacyConfig(data);
        }

        return validGrant && isValid;
      } catch (error) {
        console.warn("Error fetching grants: ", error);
        const delay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
      }
    }
    console.error("Max retries exceeded, giving up.");
    return false;
  }

  /**
   * Wipe persisted state and instance variables.
   */
  async logout(): Promise<void> {
    await Promise.all([
      this.storageStrategy.removeItem("xion-authz-temp-account"),
      this.storageStrategy.removeItem("xion-authz-granter-account"),
    ]);
    this.abstractAccount = undefined;
    this.triggerAuthStateChange(false);
  }

  /**
   * Authenticates the user based on the presence of a local keypair and a granter address.
   * Also checks if the grant is still valid by verifying the expiration.
   * If valid, sets the abstract account and triggers authentication state change.
   * If expired, clears local state and prompts reauthorization.
   *
   * @returns {Promise<void>} - Resolves if authentication is successful or logs out the user otherwise.
   */
  async authenticate(): Promise<void> {
    try {
      const keypair = await this.getLocalKeypair();
      const granter = await this.getGranter();

      if (!keypair || !granter) {
        console.warn("Missing keypair or granter, cannot authenticate.");
        return;
      }

      const accounts = await keypair.getAccounts();
      const keypairAddress = accounts[0].address;

      // Check for existing grants with an expiration check
      const isGrantValid = await this.pollForGrants(keypairAddress, granter);

      if (isGrantValid) {
        this.abstractAccount = keypair;
        this.triggerAuthStateChange(true);
      } else {
        throw new Error(
          "Grants expired, no longer valid, or not found. Logging out.",
        );
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      await this.logout();
    }
  }

  /**
   * Initiates the login process for the user.
   * Checks if a local keypair and granter address exist, either from URL parameters or this.storageStrategy.
   * If both exist, polls for grants and updates the authentication state if successful.
   * If not, generates a new keypair and redirects to the dashboard for grant issuance.
   *
   * @returns {Promise<void>} - A Promise that resolves once the login process is complete.
   * @throws {Error} - If the login process encounters an error.
   */
  async login(): Promise<void> {
    try {
      if (this.isLoginInProgress) {
        console.warn("Login is already in progress.");
        return;
      }
      this.isLoginInProgress = true;
      // Get local keypair and granter address from either URL param (if new) or this.storageStrategy (if existing)
      const keypair = await this.getLocalKeypair();
      const storedGranter = await this.getGranter();
      const urlGranter = await this.redirectStrategy.getUrlParameter("granter");
      const granter = storedGranter || urlGranter;

      // If both exist, we can assume user is either 1. already logged in and grants have been created for the temp key, or 2. been redirected with the granter url param
      // In either case, we poll for grants and make the appropriate state changes to reflect a "logged in" state
      if (keypair && granter) {
        const accounts = await keypair.getAccounts();
        const keypairAddress = accounts[0].address;
        const pollSuccess = await this.pollForGrants(keypairAddress, granter);
        if (!pollSuccess) {
          throw new Error("Poll was unsuccessful. Please try again");
        }

        this.setGranter(granter);
        this.abstractAccount = keypair;
        this.triggerAuthStateChange(true);

        if (typeof window !== "undefined") {
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          currentUrl.searchParams.delete("granter");
          history.pushState({}, "", currentUrl.href);
        }
      } else {
        // If there isn't an existing keypair, or there isn't a granter in either this.storageStrategy or the url params, we want to start from scratch
        // Generate new keypair and redirect to dashboard
        await this.newKeypairFlow();
      }
      return;
    } catch (error) {
      console.warn("Something went wrong: ", error);
      throw error;
    } finally {
      this.isLoginInProgress = false;
    }
  }

  /**
   * Initiates the flow to generate a new keypair and redirect to the dashboard for grant issuance.
   */
  private async newKeypairFlow(): Promise<void> {
    try {
      await this.generateAndStoreTempAccount();
      await this.redirectToDashboard();
    } catch (error) {
      console.warn("Something went wrong: ", error);
      throw error;
    }
  }
}
