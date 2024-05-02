import { GasPrice } from "@cosmjs/stargate";
import { fetchConfig } from "@burnt-labs/constants";
import type {
  ContractGrantDescription,
  GrantsResponse,
  SpendLimit,
} from "@/types";
import { wait } from "@/utils";
import { GranteeSignerClient } from "./GranteeSignerClient";
import { SignArbSecp256k1HdWallet } from "./SignArbSecp256k1HdWallet";

export class AbstraxionAuth {
  // Config
  private dashboardUrl?: string;
  private restUrl?: string;
  private rpcUrl?: string;
  grantContracts?: ContractGrantDescription[];
  stake?: boolean;
  bank?: SpendLimit[];

  // State
  isLoggedIn = false;
  authStateChangeSubscribers: ((isLoggedIn: boolean) => void)[] = [];

  // Signer
  private client?: GranteeSignerClient;

  // Accounts
  signArbWallet?: SignArbSecp256k1HdWallet; // local keypair
  abstractAccount?: SignArbSecp256k1HdWallet; // Only exists if grants were issued, irregardless if localStorage keypair exists

  constructor(
    rpc: string,
    restUrl?: string,
    grantContracts?: ContractGrantDescription[],
    stake?: boolean,
    bank?: SpendLimit[],
  ) {
    this.initializeConfig(rpc, restUrl);
    this.grantContracts = grantContracts;
    this.stake = stake;
    this.bank = bank;
  }

  private async initializeConfig(rpc: string, restUrl?: string) {
    try {
      const { dashboardUrl, restUrl: configRestUrl } = await fetchConfig(rpc);
      this.dashboardUrl = dashboardUrl;
      this.restUrl = restUrl || configRestUrl;
      this.rpcUrl = rpc;
      await this.getLocalKeypair();
      return;
    } catch (error) {
      throw error;
    }
  }

  // Authentication State Subscription Related Functions
  subscribeToAuthStateChange(callback: (isLoggedIn: boolean) => void) {
    this.authStateChangeSubscribers.push(callback);
    return () => {
      const index = this.authStateChangeSubscribers.indexOf(callback);
      if (index !== -1) {
        this.authStateChangeSubscribers.splice(index, 1);
      }
    };
  }

  private triggerAuthStateChange(isLoggedIn: boolean) {
    this.isLoggedIn = isLoggedIn;
    this.authStateChangeSubscribers.forEach((callback) => callback(isLoggedIn));
  }

  // Granter Related Functions
  getGranter() {
    const granterAddress = localStorage.getItem("xion-authz-granter-account");
    return granterAddress;
  }

  private removeGranterAddress() {
    localStorage.removeItem("xion-authz-granter-account");
  }

  private setGranter(address: string) {
    localStorage.setItem("xion-authz-granter-account", address);
  }

  // Local Keypair Functions
  private async getLocalKeypair() {
    const localKeypair = localStorage.getItem("xion-authz-temp-account");
    if (!localKeypair) {
      return undefined;
    }
    const keypairWallet = await SignArbSecp256k1HdWallet.deserialize(
      localKeypair,
      "abstraxion",
    );
    this.signArbWallet = keypairWallet;
    return keypairWallet;
  }

  private async generateAndStoreTempAccount(): Promise<SignArbSecp256k1HdWallet> {
    const keypair = await SignArbSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });

    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);

    this.signArbWallet = keypair;
    this.removeGranterAddress(); // Prevent multiple truth issue

    return keypair;
  }

  private async getKeypairAddress() {
    if (this.signArbWallet) {
      const accounts = await this.signArbWallet.getAccounts();
      const address = accounts[0].address;
      return address;
    } else {
      return "";
    }
  }

  async getAccountAddress() {
    if (this.abstractAccount) {
      const accounts = await this.abstractAccount.getAccounts();
      const address = accounts[0].address;
      return address;
    } else {
      return "";
    }
  }

  // Signer related functions
  async getSigner() {
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

      const granterAddress = this.getGranter();

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
        },
      );

      const wallet = await this.getLocalKeypair();
      if (wallet) {
        this.signArbWallet = wallet;
      }

      this.client = directClient;
      return directClient;
    } catch (error) {
      console.warn("Something went wrong getting signer: ", error);
      this.client = undefined;
      throw error;
    }
  }

  // Redirects to dashboard in order to issue claim with XION meta account for local keypair
  openDashboardTab(userAddress: string): void {
    if (typeof window !== "undefined") {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams();

      if (this.bank) {
        urlParams.set("bank", JSON.stringify(this.bank));
      }

      if (this.stake) {
        urlParams.set("stake", "true");
      }

      urlParams.set("grantee", userAddress);

      if (this.grantContracts) {
        urlParams.set("contracts", JSON.stringify(this.grantContracts));
      }

      urlParams.set("redirect_uri", currentUrl);

      const queryString = urlParams.toString(); // Convert URLSearchParams to string
      window.location.href = `${this.dashboardUrl}?${queryString}`;
    } else {
      // TODO - Adjust behavior
      alert("Window not defined. Cannot redirect to dashboard");
    }
  }

  // Polls for grants issued to the local keypair
  async pollForGrants(): Promise<void> {
    const localKeypair = await this.getLocalKeypair();
    if (!localKeypair) {
      throw new Error("No account found.");
    }

    const grantee = await this.getKeypairAddress();

    const searchParams = new URLSearchParams(window.location.search);
    const granter = searchParams.get("granter");

    if (!granter) {
      throw new Error("No granter found.");
    }

    const maxRetries = 5;
    let retries = 0;

    const poll = async () => {
      try {
        const baseUrl = `${this.restUrl}/cosmos/authz/v1beta1/grants`;
        const url = new URL(baseUrl);
        const params = new URLSearchParams({
          grantee,
          granter,
        });
        url.search = params.toString();
        const res = await fetch(url, {
          cache: "no-store",
        });
        const data = (await res.json()) as GrantsResponse;
        if (data.grants.length > 0) {
          const granterAddresses = data.grants.map((grant) => grant.granter);
          const uniqueGranters = [...new Set(granterAddresses)];
          if (uniqueGranters.length > 1) {
            console.warn("More than one granter found. Taking first.");
          }

          this.setGranter(uniqueGranters[0]);
          this.abstractAccount = this.signArbWallet;
          this.triggerAuthStateChange(true);
          // Remove query parameter "granted"
          if (typeof window !== undefined) {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.delete("granted");
            currentUrl.searchParams.delete("granter");
            history.pushState({}, "", currentUrl.href);
            return true;
          }
        } else {
          // No grants found, retry with exponential backoff
          if (retries < maxRetries) {
            const delay = Math.pow(2, retries) * 1000;
            setTimeout(poll, delay);
            retries++;
          } else {
            console.error("Max retries exceeded, giving up.");
            return false;
          }
        }
      } catch (error) {
        console.error("Error while polling:", error);
        // Retry immediately in case of network error
        if (retries < maxRetries) {
          setTimeout(poll, 1000);
          retries++;
        } else {
          console.error("Max retries exceeded, giving up.");
          throw error;
        }
      }
    };

    await poll();
  }

  logout() {
    localStorage.removeItem("xion-authz-temp-account");
    localStorage.removeItem("xion-authz-granter-account");
    this.signArbWallet = undefined;
    this.abstractAccount = undefined;
    this.triggerAuthStateChange(false);
  }

  // Do we want to build this out more?
  async authenticate() {
    const keypair = await this.getLocalKeypair();
    const granter = this.getGranter();

    if (keypair && granter) {
      this.abstractAccount = this.signArbWallet;
      this.triggerAuthStateChange(true);
    }
  }

  // Handle different possible cases of logging in
  async login() {
    try {
      const keypair = await this.getLocalKeypair();
      const searchParams = new URLSearchParams(window.location.search);
      const granter = this.getGranter() || searchParams.get("granter");

      if (keypair && granter) {
        await this.pollForGrants();
        this.abstractAccount = this.signArbWallet;
        this.triggerAuthStateChange(true);
      } else {
        await this.newKeypairFlow();
      }
    } catch (error) {
      console.warn("Something went wrong: ", error);
      throw error;
    }
  }

  // Fresh flow, create new keypair and redirect to dashboard for grant
  private async newKeypairFlow() {
    try {
      const newKeypair = await this.generateAndStoreTempAccount();
      const accounts = await newKeypair.getAccounts();
      const address = accounts[0].address;
      this.openDashboardTab(address);
    } catch (error) {
      console.warn("Something went wrong: ", error);
      throw error;
    }
  }
}
