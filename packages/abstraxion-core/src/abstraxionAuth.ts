import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { fetchConfig } from "@burnt-labs/constants";
import { ContractGrantDescription, GrantsResponse, SpendLimit } from "@/types";
import { wait } from "@/utils";
import { GranteeSignerClient } from "./GranteeSignerClient";
import { GasPrice } from "@cosmjs/stargate";
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
  signArbWallet?: SignArbSecp256k1HdWallet;

  // TODO: Clean up. Do we need keypair? Difference between abstractAccount and signArbWallet

  // Accounts
  keypair?: DirectSecp256k1HdWallet;
  abstractAccount?: DirectSecp256k1HdWallet; // Only exists if grants were issued, irregardless if localStorage keypair exists

  constructor(
    rpc: string,
    grantContracts?: ContractGrantDescription[],
    stake?: boolean,
    bank?: SpendLimit[],
  ) {
    this.initializeConfig(rpc);
    this.grantContracts = grantContracts;
    this.stake = stake;
    this.bank = bank;
  }

  private async initializeConfig(rpc: string) {
    try {
      const { dashboardUrl, restUrl } = await fetchConfig(rpc);
      this.dashboardUrl = dashboardUrl;
      this.restUrl = restUrl;
      this.rpcUrl = rpc;
      await this.getTempAccount();
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
  private async getTempAccount() {
    const localKeypair = localStorage.getItem("xion-authz-temp-account");
    if (!localKeypair) {
      return undefined;
    }
    const keypairWallet = await DirectSecp256k1HdWallet.deserialize(
      localKeypair,
      "abstraxion",
    );
    this.keypair = keypairWallet;
    return keypairWallet;
  }

  private async getSignArbAccount() {
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

  private async generateAndStoreTempAccount(): Promise<DirectSecp256k1HdWallet> {
    const keypair = await DirectSecp256k1HdWallet.generate(12, {
      prefix: "xion",
    });

    const serializedKeypair = await keypair.serialize("abstraxion");
    localStorage.setItem("xion-authz-temp-account", serializedKeypair);

    this.keypair = keypair;
    this.removeGranterAddress(); // Prevent multiple truth issue

    return keypair;
  }

  private async getKeypairAddress() {
    if (this.keypair) {
      const accounts = await this.keypair.getAccounts();
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
        .then((accounts) => {
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

      const wallet = await this.getSignArbAccount();
      if (wallet) {
        this.signArbWallet = wallet;
      }

      this.client = directClient;
      return directClient;
    } catch (error) {
      console.log("Something went wrong: ", error);
      this.client = undefined;
    }
  }

  // Redirects to dashboard in order to issue claim with XION meta account for local keypair
  openDashboardTab(userAddress: string): void {
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
  }

  // Polls for grants issued to the local keypair
  async pollForGrants(): Promise<boolean> {
    const localKeypair = await this.getTempAccount();
    if (!localKeypair) {
      throw new Error("No account found.");
    }

    const address = await this.getKeypairAddress();

    const shouldContinue = true;
    while (shouldContinue) {
      try {
        await wait(3000);
        const res = await fetch(
          `${this.restUrl}/cosmos/authz/v1beta1/grants/grantee/${address}`,
          {
            cache: "no-store",
          },
        );
        const data = (await res.json()) as GrantsResponse;
        if (data.grants.length > 0) {
          const granterAddresses = data.grants.map((grant) => grant.granter);
          const uniqueGranters = [...new Set(granterAddresses)];
          if (uniqueGranters.length > 1) {
            console.warn("More than one granter found. Taking first.");
          }

          this.setGranter(uniqueGranters[0]);
          this.abstractAccount = this.keypair;
          this.triggerAuthStateChange(true);
          // Remove query parameter "granted"
          const currentUrl = new URL(window.location.href);
          currentUrl.searchParams.delete("granted");
          history.pushState({}, "", currentUrl.href);
          break;
        }
      } catch (error) {
        throw error;
      }
    }
    return true;
  }

  logout() {
    localStorage.removeItem("xion-authz-temp-account");
    localStorage.removeItem("xion-authz-granter-account");
    this.keypair = undefined;
    this.abstractAccount = undefined;
    this.triggerAuthStateChange(false);
  }

  // Do we want to build this out more?
  async authenticate() {
    const keypair = await this.getTempAccount();
    const granter = this.getGranter();

    if (keypair && granter) {
      this.abstractAccount = this.keypair;
      this.triggerAuthStateChange(true);
    }
  }

  // Handle different possible cases of logging in
  async login() {
    try {
      const keypair = await this.getTempAccount();
      const granter = this.getGranter();

      if (keypair && granter) {
        // Already logged in, just update state
        this.abstractAccount = this.keypair;
        this.triggerAuthStateChange(true);
      } else if (keypair && !granter) {
        // TODO: Need to implement a timeout or a max request for polling
        // Then handle case where nothing was found
        await this.pollForGrants();
      } else {
        await this.newKeypairFlow();
      }
    } catch (error) {
      console.warn("Something went wrong: ", error);
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
    }
  }
}
