import "./styles.css";

export {
  Abstraxion,
  AbstraxionProvider,
  abstraxionAuth,
} from "./components/Abstraxion";
export {
  useAbstraxionAccount,
  useAbstraxionSigningClient,
  useAbstraxionClient,
  useModal,
} from "./hooks";

export type { ContractGrantDescription } from "./components/AbstraxionContext";
export type {
  GranteeSignerClient,
  GrantsResponse,
  Grant,
  TreasuryGrantConfig,
  SpendLimit,
} from "@burnt-labs/abstraxion-core";
