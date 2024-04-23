import React from "react";
import ReactDOM from "react-dom/client";
import { StytchProvider } from "@stytch/react";
import { ApolloProvider } from "@apollo/client";
import { GrazProvider } from "graz";
import { apolloClient, stytchClient } from "./lib";
import { AbstraxionContextProvider } from "./components/AbstraxionContext";
import { App } from "./components/App";

import "./index.css";
import "@burnt-labs/ui/dist/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AbstraxionContextProvider>
      <StytchProvider stytch={stytchClient}>
        <ApolloProvider client={apolloClient}>
          <GrazProvider>
            <App />
          </GrazProvider>
        </ApolloProvider>
      </StytchProvider>
    </AbstraxionContextProvider>
  </React.StrictMode>,
);
