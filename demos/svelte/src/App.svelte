<script lang="ts">
  import { createAbstraxionStore } from "./lib/abstraxion";

  // `auto` resolves to popup on desktop, redirect on mobile/PWA — see
  // `resolveAutoAuth` in @burnt-labs/abstraxion-js. Both fallbacks need
  // `authAppUrl` (popup tab URL); redirect also uses it as the dashboard URL.
  const {
    store,
    login,
    logout,
    manageAuthenticators,
    isManageAuthSupported,
  } = createAbstraxionStore({
    chainId: import.meta.env.VITE_CHAIN_ID,
    rpcUrl: import.meta.env.VITE_RPC_URL,
    restUrl: import.meta.env.VITE_REST_URL,
    gasPrice: import.meta.env.VITE_GAS_PRICE,
    treasury: import.meta.env.VITE_TREASURY_ADDRESS,
    authentication: {
      type: "auto",
      authAppUrl: import.meta.env.VITE_AUTH_APP_URL,
    },
  });

  let recipient = $state("");
  let amount = $state("");
  let txHash = $state<string | null>(null);
  let txError = $state<string | null>(null);
  let isSending = $state(false);
  let balance = $state<string | null>(null);

  type ManageStatus = "idle" | "pending" | "success" | "cancelled" | "error";
  let manageStatus = $state<ManageStatus>("idle");
  let manageError = $state<string | null>(null);

  async function handleManage() {
    manageStatus = "pending";
    manageError = null;
    try {
      await manageAuthenticators($store.granterAddress);
      manageStatus = "success";
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancelled = /cancelled|closed/i.test(msg);
      manageStatus = isCancelled ? "cancelled" : "error";
      if (!isCancelled) manageError = msg;
    }
  }

  async function fetchBalance() {
    const client = $store.signingClient as any;
    if (!client || !$store.granterAddress) {
      balance = null;
      return;
    }
    try {
      const balances = await client.getAllBalances($store.granterAddress);
      const xion = balances.find((b: { denom: string }) => b.denom === "uxion");
      balance = xion
        ? (parseInt(xion.amount as string) / 1_000_000).toFixed(6)
        : "0";
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      balance = "Error";
    }
  }

  $effect(() => {
    if ($store.isConnected) fetchBalance();
  });

  async function handleSend() {
    const client = $store.signingClient;
    const address = $store.granterAddress;
    if (!client || !address) return;

    if (!recipient.startsWith("xion1")) {
      txError = "Invalid recipient address. Must start with xion1";
      return;
    }
    isSending = true;
    txHash = null;
    txError = null;
    try {
      const amountUxion = (parseFloat(amount) * 1_000_000).toString();
      const result = await client.sendTokens(
        address,
        recipient,
        [{ denom: "uxion", amount: amountUxion }],
        "auto",
        "Svelte demo: send",
      );
      // Redirect mode resolves with `void` (page navigates before resolving).
      if (result) {
        txHash = result.transactionHash;
        recipient = "";
        amount = "";
        setTimeout(fetchBalance, 1000);
      }
    } catch (err: any) {
      txError = err.message ?? "Transaction failed";
    } finally {
      isSending = false;
    }
  }
</script>

<main class="mx-auto flex min-h-screen w-full max-w-md flex-col items-center gap-6 px-6 pb-12 pt-16 sm:pt-24">
  <header class="text-center">
    <h1 class="text-3xl font-bold tracking-tighter">ABSTRAXION</h1>
    <p class="mt-1 text-sm text-gray-400">Svelte reference demo</p>
    <p class="mt-2 text-xs text-gray-500">
      Wires <code class="rounded bg-white/10 px-1 py-0.5">createController</code>
      from <code class="rounded bg-white/10 px-1 py-0.5">@burnt-labs/abstraxion-js</code>
      into a Svelte
      <code class="rounded bg-white/10 px-1 py-0.5">writable</code> store. Redirect mode.
    </p>
  </header>

  <section class="grid w-full grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-white/10 bg-gray-900/50 p-4 text-xs">
    <p class="col-span-2 mb-2 font-mono font-semibold text-cyan-400">state machine</p>
    <span class="font-mono text-gray-400">isInitializing:</span>
    <span class="text-right font-mono {$store.isInitializing ? 'text-yellow-400' : 'text-gray-600'}">
      {$store.isInitializing}
    </span>
    <span class="font-mono text-gray-400">isConnecting:</span>
    <span class="text-right font-mono {$store.isConnecting ? 'text-blue-400' : 'text-gray-600'}">
      {$store.isConnecting}
    </span>
    <span class="font-mono text-gray-400">isConnected:</span>
    <span class="text-right font-mono {$store.isConnected ? 'text-green-400' : 'text-gray-600'}">
      {$store.isConnected}
    </span>
    <span class="font-mono text-gray-400">isDisconnected:</span>
    <span class="text-right font-mono {$store.isDisconnected ? 'text-red-400' : 'text-gray-600'}">
      {$store.isDisconnected}
    </span>
    <span class="font-mono text-gray-400">isError:</span>
    <span class="text-right font-mono {$store.isError ? 'text-red-400' : 'text-gray-600'}">
      {$store.isError}
    </span>
  </section>

  {#if $store.isError}
    <p class="w-full rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
      {$store.error}
    </p>
  {/if}

  <button
    type="button"
    class="w-full rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 {$store.isConnected
      ? 'border border-white/20 text-white hover:bg-white/10'
      : 'bg-white text-black hover:bg-gray-200'}"
    disabled={$store.isInitializing || $store.isConnecting}
    onclick={() => ($store.isConnected ? logout() : login())}
  >
    {#if $store.isConnected}
      <span class="flex items-center justify-between">
        <span class="flex items-center gap-2">
          <span class="h-2 w-2 animate-pulse rounded-full bg-green-400"></span>
          Connected: {$store.granterAddress.slice(0, 12)}…
        </span>
        <span class="text-lg opacity-60">×</span>
      </span>
    {:else if $store.isInitializing}
      Checking session…
    {:else if $store.isConnecting}
      Connecting…
    {:else}
      Connect Wallet →
    {/if}
  </button>

  {#if $store.isConnected}
    <section class="w-full space-y-2 rounded-lg border border-white/10 bg-gray-900/50 p-4">
      <h3 class="font-semibold">Account Info</h3>
      <p class="break-all text-xs text-gray-400">{$store.granterAddress}</p>
      <p class="text-sm text-gray-400">
        Balance:
        {#if balance === null}
          loading…
        {:else}
          <span class="font-mono text-white">{balance} XION</span>
        {/if}
      </p>
    </section>

    <section class="w-full space-y-3 rounded-lg border border-white/10 bg-gray-900/50 p-4">
      <h3 class="font-semibold">Send XION</h3>

      <label class="block space-y-1">
        <span class="text-sm text-gray-400">Recipient</span>
        <input
          type="text"
          bind:value={recipient}
          placeholder="xion1..."
          class="w-full rounded border border-white/20 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
        />
      </label>

      <label class="block space-y-1">
        <span class="text-sm text-gray-400">Amount (XION)</span>
        <input
          type="number"
          bind:value={amount}
          placeholder="0.001"
          step="0.001"
          min="0"
          class="w-full rounded border border-white/20 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none"
        />
      </label>

      <button
        type="button"
        class="w-full rounded-md bg-white px-4 py-2 text-sm font-semibold uppercase tracking-wide text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={handleSend}
        disabled={isSending || !recipient || !amount}
      >
        {isSending ? "Sending…" : "Send Tokens"}
      </button>

      {#if txHash}
        <p class="rounded border border-green-500/20 bg-green-500/10 p-2 text-xs text-green-400">
          Success! Hash: <span class="text-gray-400 break-all">{txHash}</span>
        </p>
      {/if}
      {#if txError}
        <p class="rounded border border-red-500/20 bg-red-500/10 p-2 text-xs text-red-400">
          {txError}
        </p>
      {/if}
    </section>

    {#if isManageAuthSupported}
      <section class="w-full space-y-2 rounded-lg border border-white/10 bg-gray-900/30 p-4">
        <h3 class="text-sm font-semibold">Manage Your Account</h3>
        <p class="text-xs text-gray-400">
          Add or remove ways to sign in (passkey, social, wallet) via the
          dashboard. Opens in the same transport as login.
        </p>
        <button
          type="button"
          class="w-full rounded-md border border-white/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={manageStatus === "pending"}
          onclick={handleManage}
        >
          {manageStatus === "pending"
            ? "Opening dashboard…"
            : "Manage Authenticators ↗"}
        </button>
        {#if manageStatus === "success"}
          <p class="text-xs text-green-400">Authenticators updated.</p>
        {:else if manageStatus === "cancelled"}
          <p class="text-xs text-yellow-400">Cancelled.</p>
        {:else if manageStatus === "error" && manageError}
          <p class="text-xs text-red-400">{manageError}</p>
        {/if}
      </section>
    {/if}
  {/if}
</main>
