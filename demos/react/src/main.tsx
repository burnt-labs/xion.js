import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Route,
  Routes,
} from "react-router-dom";

import { HomePage } from "@/pages/HomePage";
import { AutoModePage } from "@/pages/AutoModePage";
import { EmbeddedModePage } from "@/pages/EmbeddedModePage";
import { SignerModePage } from "@/pages/SignerModePage";
import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <main className="m-auto flex min-h-screen w-full max-w-2xl flex-col p-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auto" element={<AutoModePage />} />
          <Route path="/embedded" element={<EmbeddedModePage />} />
          <Route path="/signer-mode" element={<SignerModePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  </StrictMode>,
);
