/**
 * SDK ↔ Dashboard contract tests — driven against the live testnet dashboard.
 *
 * What this validates:
 *   1. Each SDK-driven mode (`inline`, `popup`, `sign`, `add-authenticators`)
 *      mounts the dashboard SPA cleanly with no JS / console errors.
 *   2. The iframe handshake the SDK depends on actually works end-to-end:
 *      after building the URL the way IframeController does, the live
 *      dashboard mounts and posts `{ type: IFRAME_READY }` back to the
 *      parent origin within the timeout the SDK waits for.
 *   3. The live dashboard's IframeMessageHandler still exposes a route for
 *      every inbound `IframeMessageType` the SDK can send — and correctly
 *      rejects the dashboard-to-SDK-only types if sent inbound. Catches the
 *      drift case where xion-dashboard-app's *unit* contract tests pass but
 *      a deployed bundle is missing/renamed cases.
 *   4. The handler still enforces the SDK-relevant security boundaries:
 *      missing requestId, oversize payload, duplicate requestId (replay),
 *      invalid `target` field. These are the codes the SDK error-paths
 *      surface to consumers, so a regression in any of them is observable.
 *   5. Popup-mode page mounts as a real popup (window.opener wired) — the
 *      transport popup-mode rejection (CONNECT_REJECTED → window.opener)
 *      depends on this being true.
 *
 * What this does NOT validate:
 *   - Auth completion. CONNECT-through-to-success requires a real Stytch
 *     session / wallet, which we don't have in CI. We only validate the
 *     SDK-side handshake — the dashboard mounting its IframeMessageHandler
 *     and signaling IFRAME_READY proves the URL contract and the postMessage
 *     contract; the rest of CONNECT is exercised by xion-dashboard-app's
 *     own unit tests at src/tests/messaging/handler-sdk-contract.test.ts.
 *   - Symbolic enum-string drift. The dashboard imports IframeMessageType,
 *     DashboardMessageType, and all payload types directly from
 *     @burnt-labs/abstraxion-core (xion-dashboard-app/src/messaging/types.ts),
 *     so drift would surface as a TypeScript compile error before deploy.
 *   - Rate limiting (would burn the per-origin counter and flake adjacent
 *     tests in the same browser context) and FORBIDDEN_ORIGIN (can't fake a
 *     different origin from a single Playwright context). Both are exercised
 *     in the dashboard's own unit tests.
 *   - Auth completion / wallet signing — needs a real Stytch session.
 *
 * Where this runs:
 *   - testnet (auth.testnet.burnt.com) — blocking CI step in
 *     integration-tests.yml on every PR, gated outside the broader integration
 *     suite's failure cap.
 *   - mainnet (settings.burnt.com) — separate, non-blocking CI job that runs
 *     only on PRs targeting `main`; failures post a PR comment but do not
 *     block. Override URL via DASHBOARD_URL env var.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
// playwright re-exports its types from playwright-core. Under
// preserveSymlinks=true the re-export hop doesn't resolve cleanly through pnpm's
// .pnpm graph, so we import the runtime entry from `playwright` and types from
// `playwright-core` directly — playwright-core is added as an explicit devDep
// (matched to playwright's version) for this reason.
import { chromium } from "playwright";
import type { Browser } from "playwright-core";
import http from "node:http";
import type { AddressInfo } from "node:net";
import {
  IframeMessageType,
  DashboardMessageType,
  MessageTarget,
} from "@burnt-labs/abstraxion-core";

// Live testnet dashboard (auth.testnet.burnt.com — the canonical xion-testnet-2
// URL). CI runs the testnet variant as a hard-fail step in integration-tests.yml.
// The mainnet variant is a separate non-blocking CI job that overrides
// DASHBOARD_URL=https://settings.burnt.com.
const DASHBOARD_URL =
  process.env.DASHBOARD_URL ?? "https://auth.testnet.burnt.com";
const DASHBOARD_ORIGIN = new URL(DASHBOARD_URL).origin;

// A bech32 address with the right prefix is enough — the dashboard parses but
// doesn't verify these in its mount path. Using a deterministic constant keeps
// failures debuggable.
const TEST_GRANTEE = "xion1ci2crahkpw7gjdyfdkcz9pp7v9eud2zyxfqnvw";

// How long we wait for IFRAME_READY before declaring a contract regression.
// Generous because CI runners + cold-start CDN can be slow; the SDK's own
// timeout is 30s (IframeController.waitForIframeReady).
const HANDSHAKE_TIMEOUT_MS = 30_000;

// Console error patterns we tolerate. The dashboard intentionally logs noise
// outside our contract — we want to catch SDK-affecting regressions, not the
// auth/session 401s that are *expected* for an unauthenticated CI browser.
//
// Patterns are matched against the console message text AND the originating
// resource URL (msg.location().url). Chromium's "Failed to load resource"
// console line carries the URL only on location(), not in text(), so URL
// matching is required for network-failure noise.
//
// What's whitelisted and why:
//   - cdn-cgi/challenge-platform: Cloudflare bot challenge — irrelevant to SDK
//   - favicon.ico: harmless 404
//   - /sdk/v1/sessions/authenticate: Stytch SDK's session check (e.g.
//     https://stytch.testnet.burnt.com/sdk/v1/sessions/authenticate). Stytch
//     auto-fires this on StytchProvider mount; 401 is the *correct* response
//     when no session cookie is present. Path-matching avoids the host
//     drifting between testnet/mainnet/proxy hosts.
//   - /api/v1/sessions/authenticate(-no-session|-oauth-no-session): the
//     dashboard's JWT signer and AddAuthenticators flow probe these on boot;
//     401s here are expected pre-login and orthogonal to the SDK contract.
const IGNORED_CONSOLE_PATTERNS = [
  /cdn-cgi\/challenge-platform/i,
  /favicon\.ico/i,
  /\/sdk\/v1\/sessions\/authenticate/i,
  /\/api\/v1\/sessions\/authenticate/i,
];

// Set DEBUG_CONSOLE=1 when adding a new mode or chasing a flake to dump every
// console error (text + originating URL) the dashboard emits. Off by default.
const DEBUG_CONSOLE = process.env.DEBUG_CONSOLE === "1";

let browser: Browser;
let harnessServer: http.Server;
let harnessUrl: string;

beforeAll(async () => {
  browser = await chromium.launch();

  // The dashboard sends IFRAME_READY targeting `new URL(redirect_uri).origin`,
  // so the test page must live at a real http origin (not about:blank).
  // We host a single empty page on localhost just to give the test page an
  // origin the dashboard can postMessage back to.
  harnessServer = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      '<!doctype html><html><body><div id="container"></div></body></html>',
    );
  });
  await new Promise<void>((resolve) => {
    harnessServer.listen(0, "127.0.0.1", resolve);
  });
  const port = (harnessServer.address() as AddressInfo).port;
  harnessUrl = `http://127.0.0.1:${port}/`;
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await new Promise<void>((resolve) =>
    harnessServer ? harnessServer.close(() => resolve()) : resolve(),
  );
});

interface ModeFixture {
  name: string;
  params: Record<string, string>;
}

// Mirrors the mode params each SDK code path actually constructs. Keep these
// in sync with PopupController/IframeController/RedirectController if the SDK
// adds a new mode.
const MODE_FIXTURES: ModeFixture[] = [
  { name: "root (no mode)", params: {} },
  {
    name: "inline (IframeController)",
    params: {
      mode: "inline",
      grantee: TEST_GRANTEE,
      redirect_uri: "PLACEHOLDER_HARNESS_URL",
    },
  },
  {
    name: "popup (PopupController)",
    params: {
      mode: "popup",
      grantee: TEST_GRANTEE,
      redirect_uri: "PLACEHOLDER_HARNESS_URL",
    },
  },
  {
    name: "sign (PopupController.signAndBroadcast)",
    params: {
      mode: "sign",
      // Base64("test") — the dashboard should render an error UI on bad tx
      // payloads, not crash during boot. We're testing boot-resilience here.
      tx: "dGVzdA==",
      granter: TEST_GRANTEE,
      redirect_uri: "PLACEHOLDER_HARNESS_URL",
    },
  },
  {
    name: "add-authenticators (manage flow)",
    params: {
      mode: "add-authenticators",
      redirect_uri: "PLACEHOLDER_HARNESS_URL",
    },
  },
];

function buildDashboardUrl(params: Record<string, string>): string {
  const url = new URL(DASHBOARD_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(
      key,
      value === "PLACEHOLDER_HARNESS_URL" ? harnessUrl : value,
    );
  }
  return url.toString();
}

describe("SDK ↔ Dashboard Contract (live testnet)", () => {
  describe("each SDK-driven mode mounts the dashboard SPA cleanly", () => {
    for (const fixture of MODE_FIXTURES) {
      it(`mode: ${fixture.name}`, async () => {
        const url = buildDashboardUrl(fixture.params);
        const context = await browser.newContext();
        const page = await context.newPage();

        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() !== "error") return;
          const text = msg.text();
          const url = msg.location()?.url ?? "";
          if (DEBUG_CONSOLE) {
            // eslint-disable-next-line no-console
            console.log(`[console.error][${fixture.name}] ${text} @ ${url}`);
          }
          // Match against text + URL — Chromium's "Failed to load resource"
          // line keeps the URL on location() only, so text-only matching
          // would miss every network-failure 401 the dashboard probes on boot.
          const haystack = `${text}\n${url}`;
          if (IGNORED_CONSOLE_PATTERNS.some((re) => re.test(haystack))) return;
          consoleErrors.push(`${text} @ ${url}`);
        });
        page.on("pageerror", (err) => {
          pageErrors.push(err.stack ?? err.message);
        });

        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30_000,
        });
        expect(response, `no response for ${url}`).not.toBeNull();
        expect(
          response!.status(),
          `mode=${fixture.name} returned non-200 at ${response!.url()}`,
        ).toBe(200);

        // Wait for React to mount something into #root. We don't assert on
        // specific copy yet because the rendered view depends on session state
        // we don't control — but #root having children proves polyfills +
        // module load + initial render finished without throwing.
        await page.waitForFunction(
          () => {
            const root = document.getElementById("root");
            return !!root && root.childElementCount > 0;
          },
          { timeout: 15_000 },
        );

        // Every SDK-driven mode (root, inline, popup, sign, add-authenticators)
        // routes to LoginModal when no session is present (App.tsx:372, 402,
        // 424, 447). The LoginScreen Dialog renders "Log in / Sign up" as its
        // title — a stable, unauthenticated-visible marker that proves the
        // mode-specific pre-auth render path executed without crashing. If a
        // future mode adds its own pre-auth UI without LoginModal, update this
        // assertion alongside the new MODE_FIXTURES entry.
        await page.waitForFunction(
          () => {
            const text = document.body.innerText ?? "";
            return /Log in\s*\/\s*Sign up/i.test(text);
          },
          { timeout: 15_000 },
        );

        // Inline mode runs an additional useEffect (App.tsx:68-82) that makes
        // the document transparent so the embedding dApp shows through.
        // Asserting on this proves the inline-mode branch actually ran — not
        // just that LoginModal rendered (which it would for any mode).
        if (fixture.params.mode === "inline") {
          const bodyBg = await page.evaluate(
            () => document.body.style.background,
          );
          expect(
            bodyBg,
            "inline mode should set document.body.style.background = 'transparent'",
          ).toBe("transparent");
        }

        // Settle window for late-firing async errors (useEffect-triggered fetches etc.)
        await page.waitForTimeout(2_000);

        expect(
          pageErrors,
          `mode=${fixture.name} fired uncaught errors`,
        ).toEqual([]);
        expect(
          consoleErrors,
          `mode=${fixture.name} logged console errors`,
        ).toEqual([]);

        await context.close();
      }, 60_000);
    }
  });

  describe("inline mode handshake", () => {
    it("dashboard sends IFRAME_READY after the iframe mounts", async () => {
      // This is the central SDK ↔ dashboard contract: IframeController
      // builds an iframe URL with mode=inline + redirect_uri, mounts the
      // iframe, and waits for {type: IFRAME_READY} on window.message.
      // If the dashboard renames the message, changes the postMessage
      // target, or removes the handshake, this test fails.
      const iframeUrl = buildDashboardUrl({
        mode: "inline",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      const result = await page.evaluate(
        async ({ url, dashboardOrigin, expectedType, timeout }) => {
          return new Promise<{
            ok: boolean;
            type?: string;
            origin?: string;
            reason?: string;
          }>((resolve) => {
            const timer = setTimeout(() => {
              resolve({
                ok: false,
                reason: `IFRAME_READY not received within ${timeout}ms`,
              });
            }, timeout);

            const handler = (event: MessageEvent) => {
              if (event.origin !== dashboardOrigin) return;
              if (
                event.data &&
                typeof event.data === "object" &&
                (event.data as { type?: unknown }).type === expectedType
              ) {
                clearTimeout(timer);
                window.removeEventListener("message", handler);
                resolve({
                  ok: true,
                  type: (event.data as { type: string }).type,
                  origin: event.origin,
                });
              }
            };
            window.addEventListener("message", handler);

            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.style.width = "400px";
            iframe.style.height = "600px";
            document.getElementById("container")!.appendChild(iframe);
          });
        },
        {
          url: iframeUrl,
          dashboardOrigin: DASHBOARD_ORIGIN,
          // Use the SDK's enum — if either side renames this string, the
          // test waits for the wrong value and times out, catching the drift.
          expectedType: DashboardMessageType.IFRAME_READY,
          timeout: HANDSHAKE_TIMEOUT_MS,
        },
      );

      expect(result.ok, result.reason).toBe(true);
      expect(result.type).toBe(DashboardMessageType.IFRAME_READY);
      expect(result.origin).toBe(DASHBOARD_ORIGIN);

      await context.close();
    }, 90_000);

    it("dashboard accepts a CONNECT MessageChannel request without immediate error", async () => {
      // This exercises the second leg of the handshake: after IFRAME_READY,
      // the SDK sends a CONNECT message via MessageChannel with port2
      // transferred to the iframe. The dashboard's IframeMessageHandler
      // should route it (no synchronous "unknown message type" error response).
      //
      // We do not wait for the CONNECT to complete — that requires the user
      // to authenticate, which a CI bot can't do. We assert only that the
      // dashboard does not synchronously reject the message within a short
      // window; a rejection here would mean the message-routing contract is
      // broken (wrong type string, wrong target, wrong payload shape).
      const iframeUrl = buildDashboardUrl({
        mode: "inline",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      const result = await page.evaluate(
        async ({
          url,
          dashboardOrigin,
          readyType,
          connectType,
          target,
          handshakeTimeout,
          rejectionWindow,
        }) => {
          return new Promise<{
            handshakeOk: boolean;
            errorResponse?: { error?: string; code?: string } | null;
            reason?: string;
          }>((resolve) => {
            const handshakeTimer = setTimeout(() => {
              resolve({
                handshakeOk: false,
                reason: `IFRAME_READY not received within ${handshakeTimeout}ms`,
              });
            }, handshakeTimeout);

            const onReady = (event: MessageEvent) => {
              if (event.origin !== dashboardOrigin) return;
              const data = event.data as { type?: unknown } | undefined;
              if (!data || data.type !== readyType) return;
              clearTimeout(handshakeTimer);
              window.removeEventListener("message", onReady);

              const iframe = document.querySelector("iframe");
              if (!iframe?.contentWindow) {
                resolve({
                  handshakeOk: true,
                  reason: "iframe contentWindow unavailable post-ready",
                });
                return;
              }

              // Build CONNECT request the same way MessageChannelManager does.
              const channel = new MessageChannel();
              let earlyError: { error?: string; code?: string } | null = null;
              channel.port1.onmessage = (e: MessageEvent) => {
                const msg = e.data as
                  | { success?: boolean; error?: string; code?: string }
                  | undefined;
                if (msg && msg.success === false) {
                  earlyError = { error: msg.error, code: msg.code };
                }
              };

              iframe.contentWindow.postMessage(
                {
                  type: connectType,
                  target,
                  payload: { grantParams: undefined },
                  requestId: "contract-test-connect",
                },
                dashboardOrigin,
                [channel.port2],
              );

              // Wait briefly to see if the dashboard rejects synchronously.
              // A successful CONNECT would block on user auth; we only care
              // about NOT seeing a fast error response.
              setTimeout(() => {
                channel.port1.close();
                resolve({ handshakeOk: true, errorResponse: earlyError });
              }, rejectionWindow);
            };
            window.addEventListener("message", onReady);

            const iframe = document.createElement("iframe");
            iframe.src = url;
            iframe.style.width = "400px";
            iframe.style.height = "600px";
            document.getElementById("container")!.appendChild(iframe);
          });
        },
        {
          url: iframeUrl,
          dashboardOrigin: DASHBOARD_ORIGIN,
          readyType: DashboardMessageType.IFRAME_READY,
          connectType: IframeMessageType.CONNECT,
          target: MessageTarget.XION_IFRAME,
          handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
          rejectionWindow: 5_000,
        },
      );

      expect(result.handshakeOk, result.reason).toBe(true);
      expect(
        result.errorResponse,
        `dashboard synchronously rejected CONNECT: ${JSON.stringify(result.errorResponse)}`,
      ).toBeFalsy();

      await context.close();
    }, 120_000);
  });

  // ─── Layer 2: handler routing + SDK-relevant security boundaries ──────────────
  //
  // The dashboard's own unit tests (handler-sdk-contract.test.ts) cover these
  // against a *mocked* handler. The probes here run against the *deployed*
  // testnet bundle — catching the drift case where the unit tests pass but a
  // built artifact was shipped with a missing case branch or a renamed code.
  //
  // All probes share a single helper: mount one inline-mode iframe, wait for
  // IFRAME_READY, then send a series of MessageChannel requests and collect
  // responses. Reusing one iframe per test keeps the suite under 30s and avoids
  // hammering the testnet CDN with a fresh mount per probe.
  describe("MessageChannel contract probes (handler routing + boundaries)", () => {
    // Inbound message types the dashboard *should* route. If the handler's
    // switch ever loses one of these case branches, the probe surfaces a
    // synchronous {success:false, code:"UNKNOWN_MESSAGE_TYPE"} response and
    // this test fails. Sourced from IframeMessageType so a rename in the SDK
    // enum would propagate here automatically.
    const INBOUND_TYPES: IframeMessageType[] = [
      IframeMessageType.CONNECT,
      IframeMessageType.SIGN_TRANSACTION,
      IframeMessageType.SIGN_AND_BROADCAST,
      IframeMessageType.GET_ADDRESS,
      IframeMessageType.DISCONNECT,
      IframeMessageType.HARD_DISCONNECT,
      IframeMessageType.MANAGE_AUTHENTICATORS,
      IframeMessageType.REMOVE_AUTHENTICATOR,
      IframeMessageType.REQUEST_GRANT,
    ];

    // Dashboard-to-SDK-only types. The handler must reject these inbound with
    // UNKNOWN_MESSAGE_TYPE — see xion-dashboard-app/src/messaging/handler.ts
    // (the IFRAME_READY/MODAL_STATE_CHANGE switch case). If the dashboard ever
    // accidentally promotes one of these to an inbound handler, this probe
    // catches it.
    const OUTBOUND_ONLY_TYPES: IframeMessageType[] = [
      IframeMessageType.IFRAME_READY,
      IframeMessageType.MODAL_STATE_CHANGE,
    ];

    it("dashboard handler exposes a route for every inbound IframeMessageType", async () => {
      const iframeUrl = buildDashboardUrl({
        mode: "inline",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      const results = await page.evaluate(
        async ({
          url,
          dashboardOrigin,
          readyType,
          target,
          types,
          handshakeTimeout,
          probeWindow,
        }) => {
          // Mount iframe + wait for IFRAME_READY first; everything below
          // assumes the handler is live.
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "400px";
          iframe.style.height = "600px";
          document.getElementById("container")!.appendChild(iframe);

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("IFRAME_READY timeout")),
              handshakeTimeout,
            );
            const onReady = (event: MessageEvent) => {
              if (event.origin !== dashboardOrigin) return;
              const data = event.data as { type?: unknown } | undefined;
              if (data?.type !== readyType) return;
              clearTimeout(timer);
              window.removeEventListener("message", onReady);
              resolve();
            };
            window.addEventListener("message", onReady);
          });

          if (!iframe.contentWindow) {
            throw new Error("iframe contentWindow gone after IFRAME_READY");
          }

          type ProbeResult = {
            type: string;
            status: "ok" | "rejected" | "timeout";
            code?: string;
            error?: string;
          };
          const out: ProbeResult[] = [];

          // Probe each type sequentially. Each probe sends a request with a
          // unique requestId so we don't trip DUPLICATE_REQUEST, and an empty
          // payload — handlers either route to a callback (which may await
          // user interaction → timeout, fine) or synchronously reject with a
          // *type-specific* error like INVALID_PAYLOAD (also fine: proves the
          // case branch dispatched). The only failure mode the assertion
          // cares about is UNKNOWN_MESSAGE_TYPE, which means the case branch
          // is gone.
          for (const t of types) {
            const result = await new Promise<ProbeResult>((resolve) => {
              const channel = new MessageChannel();
              const timer = setTimeout(() => {
                channel.port1.close();
                resolve({ type: t, status: "timeout" });
              }, probeWindow);

              channel.port1.onmessage = (e: MessageEvent) => {
                clearTimeout(timer);
                channel.port1.close();
                const msg = e.data as
                  | {
                      success?: boolean;
                      error?: string;
                      code?: string;
                    }
                  | undefined;
                if (msg?.success === false) {
                  resolve({
                    type: t,
                    status: "rejected",
                    code: msg.code,
                    error: msg.error,
                  });
                } else {
                  resolve({ type: t, status: "ok" });
                }
              };

              iframe.contentWindow!.postMessage(
                {
                  type: t,
                  target,
                  payload: {},
                  requestId: `probe-route-${t}-${Math.random()
                    .toString(36)
                    .slice(2)}`,
                },
                dashboardOrigin,
                [channel.port2],
              );
            });
            out.push(result);
          }

          return out;
        },
        {
          url: iframeUrl,
          dashboardOrigin: DASHBOARD_ORIGIN,
          readyType: DashboardMessageType.IFRAME_READY,
          target: MessageTarget.XION_IFRAME,
          types: INBOUND_TYPES,
          handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
          // Each probe waits up to 2s for a synchronous response. Async
          // handlers (CONNECT etc.) will timeout — that's a pass: the
          // handler dispatched but is awaiting user interaction.
          probeWindow: 2_000,
        },
      );

      // Single failure mode this assertion cares about: a missing case
      // branch in the dashboard's switch. Every other shape is acceptable.
      const missingHandlers = results.filter(
        (r) => r.status === "rejected" && r.code === "UNKNOWN_MESSAGE_TYPE",
      );
      expect(
        missingHandlers,
        `dashboard handler is missing case branches for: ${missingHandlers
          .map((r) => r.type)
          .join(", ")} (full results: ${JSON.stringify(results)})`,
      ).toEqual([]);

      await context.close();
    }, 120_000);

    it("dashboard rejects inbound dashboard-to-SDK-only message types", async () => {
      const iframeUrl = buildDashboardUrl({
        mode: "inline",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      const results = await page.evaluate(
        async ({
          url,
          dashboardOrigin,
          readyType,
          target,
          types,
          handshakeTimeout,
          probeWindow,
        }) => {
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "400px";
          iframe.style.height = "600px";
          document.getElementById("container")!.appendChild(iframe);

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("IFRAME_READY timeout")),
              handshakeTimeout,
            );
            const onReady = (event: MessageEvent) => {
              if (event.origin !== dashboardOrigin) return;
              if ((event.data as { type?: unknown })?.type !== readyType)
                return;
              clearTimeout(timer);
              window.removeEventListener("message", onReady);
              resolve();
            };
            window.addEventListener("message", onReady);
          });

          if (!iframe.contentWindow) throw new Error("contentWindow gone");

          const out: Array<{ type: string; code?: string; error?: string }> =
            [];
          for (const t of types) {
            const result = await new Promise<{
              type: string;
              code?: string;
              error?: string;
            }>((resolve) => {
              const channel = new MessageChannel();
              const timer = setTimeout(() => {
                channel.port1.close();
                resolve({ type: t });
              }, probeWindow);

              channel.port1.onmessage = (e: MessageEvent) => {
                clearTimeout(timer);
                channel.port1.close();
                const msg = e.data as
                  | { success?: boolean; error?: string; code?: string }
                  | undefined;
                resolve({ type: t, code: msg?.code, error: msg?.error });
              };

              iframe.contentWindow!.postMessage(
                {
                  type: t,
                  target,
                  payload: {},
                  requestId: `probe-outbound-${t}-${Math.random()
                    .toString(36)
                    .slice(2)}`,
                },
                dashboardOrigin,
                [channel.port2],
              );
            });
            out.push(result);
          }
          return out;
        },
        {
          url: iframeUrl,
          dashboardOrigin: DASHBOARD_ORIGIN,
          readyType: DashboardMessageType.IFRAME_READY,
          target: MessageTarget.XION_IFRAME,
          types: OUTBOUND_ONLY_TYPES,
          handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
          probeWindow: 2_000,
        },
      );

      for (const result of results) {
        expect(
          result.code,
          `dashboard accepted ${result.type} as inbound (should reject with UNKNOWN_MESSAGE_TYPE)`,
        ).toBe("UNKNOWN_MESSAGE_TYPE");
      }

      await context.close();
    }, 120_000);

    it("dashboard enforces SDK-relevant security boundaries", async () => {
      // Boundaries probed (codes from xion-dashboard-app/src/messaging/handler.ts):
      //   - MISSING_REQUEST_ID — handler.ts:289-296
      //   - PAYLOAD_TOO_LARGE  — handler.ts:277-285 (>100KB)
      //   - DUPLICATE_REQUEST  — handler.ts:298-313 (replay)
      //   - bad target         — handler.ts:223-228 (silent drop, no port reply)
      const iframeUrl = buildDashboardUrl({
        mode: "inline",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      const result = await page.evaluate(
        async ({
          url,
          dashboardOrigin,
          readyType,
          connectType,
          getAddressType,
          target,
          handshakeTimeout,
          probeWindow,
        }) => {
          const iframe = document.createElement("iframe");
          iframe.src = url;
          iframe.style.width = "400px";
          iframe.style.height = "600px";
          document.getElementById("container")!.appendChild(iframe);

          await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error("IFRAME_READY timeout")),
              handshakeTimeout,
            );
            const onReady = (event: MessageEvent) => {
              if (event.origin !== dashboardOrigin) return;
              if ((event.data as { type?: unknown })?.type !== readyType)
                return;
              clearTimeout(timer);
              window.removeEventListener("message", onReady);
              resolve();
            };
            window.addEventListener("message", onReady);
          });

          if (!iframe.contentWindow) throw new Error("contentWindow gone");

          // Helper: send one message + collect a single response (or timeout).
          const probe = (
            message: Record<string, unknown>,
          ): Promise<{
            success?: boolean;
            error?: string;
            code?: string;
            timedOut: boolean;
          }> =>
            new Promise((resolve) => {
              const channel = new MessageChannel();
              const timer = setTimeout(() => {
                channel.port1.close();
                resolve({ timedOut: true });
              }, probeWindow);
              channel.port1.onmessage = (e: MessageEvent) => {
                clearTimeout(timer);
                channel.port1.close();
                const msg = e.data as
                  | { success?: boolean; error?: string; code?: string }
                  | undefined;
                resolve({
                  success: msg?.success,
                  error: msg?.error,
                  code: msg?.code,
                  timedOut: false,
                });
              };
              iframe.contentWindow!.postMessage(message, dashboardOrigin, [
                channel.port2,
              ]);
            });

          // 1. Missing requestId → MISSING_REQUEST_ID.
          const missingReqId = await probe({
            type: connectType,
            target,
            payload: {},
            // requestId omitted on purpose
          });

          // 2. Oversize payload → PAYLOAD_TOO_LARGE. ~150KB string blows
          //    past the 100KB cap.
          const oversize = await probe({
            type: connectType,
            target,
            payload: { junk: "x".repeat(150_000) },
            requestId: "probe-oversize",
          });

          // 3. Duplicate requestId. First request must pass earlier checks
          //    (target, requestId, size) so the dashboard records the
          //    requestId; second request with the same id → DUPLICATE_REQUEST.
          //    GET_ADDRESS is sync and always succeeds, so we know the first
          //    response is the dispatch result, not an earlier-stage reject.
          const dupId = `probe-dup-${Math.random().toString(36).slice(2)}`;
          const firstDup = await probe({
            type: getAddressType,
            target,
            payload: {},
            requestId: dupId,
          });
          const secondDup = await probe({
            type: getAddressType,
            target,
            payload: {},
            requestId: dupId,
          });

          // 4. Bad target → handler returns silently (no port response).
          //    We expect timedOut:true.
          const badTarget = await probe({
            type: connectType,
            target: "xion_invalid_target",
            payload: {},
            requestId: "probe-bad-target",
          });

          return { missingReqId, oversize, firstDup, secondDup, badTarget };
        },
        {
          url: iframeUrl,
          dashboardOrigin: DASHBOARD_ORIGIN,
          readyType: DashboardMessageType.IFRAME_READY,
          connectType: IframeMessageType.CONNECT,
          // Pass GET_ADDRESS as a serialized string — page.evaluate ships its
          // function body to the browser, so any enum reference *inside* the
          // function body would be unresolvable at the call site.
          getAddressType: IframeMessageType.GET_ADDRESS,
          target: MessageTarget.XION_IFRAME,
          handshakeTimeout: HANDSHAKE_TIMEOUT_MS,
          probeWindow: 2_500,
        },
      );

      expect(
        result.missingReqId.code,
        `expected MISSING_REQUEST_ID, got ${JSON.stringify(result.missingReqId)}`,
      ).toBe("MISSING_REQUEST_ID");

      expect(
        result.oversize.code,
        `expected PAYLOAD_TOO_LARGE, got ${JSON.stringify(result.oversize)}`,
      ).toBe("PAYLOAD_TOO_LARGE");

      // First duplicate request must succeed (or at least be processed —
      // GET_ADDRESS returns synchronously; expect success:true). If this
      // fails the duplicate check below would also misfire.
      expect(
        result.firstDup.success,
        `first duplicate request should pass (got ${JSON.stringify(result.firstDup)})`,
      ).toBe(true);
      expect(
        result.secondDup.code,
        `expected DUPLICATE_REQUEST on replay, got ${JSON.stringify(result.secondDup)}`,
      ).toBe("DUPLICATE_REQUEST");

      expect(
        result.badTarget.timedOut,
        `expected silent drop on bad target, got response ${JSON.stringify(result.badTarget)}`,
      ).toBe(true);

      await context.close();
    }, 120_000);
  });

  // ─── Layer 3: popup-mode contract ─────────────────────────────────────────────
  //
  // Popup-mode rejection (CONNECT_REJECTED, SIGN_REJECTED, etc.) flows via
  // window.opener.postMessage — see xion-dashboard-app/src/utils/dashboard-transport.ts
  // (`sendToOpener`). If a popup is opened in a way that strips opener
  // (rel="noopener", browser policy), the rejection path silently no-ops and
  // the SDK hangs until its own timeout. This test verifies the popup-mode
  // page actually sees window.opener when opened the way PopupController opens it.
  describe("popup mode contract", () => {
    it("popup window mounts with window.opener wired and renders LoginModal", async () => {
      const popupUrl = buildDashboardUrl({
        mode: "popup",
        grantee: TEST_GRANTEE,
        redirect_uri: "PLACEHOLDER_HARNESS_URL",
      });

      const context = await browser.newContext();
      const opener = await context.newPage();
      await opener.goto(harnessUrl, { waitUntil: "domcontentloaded" });

      // Open the dashboard the way PopupController does — via window.open.
      // The new Page event fires before the popup finishes loading.
      const popupPromise = context.waitForEvent("page");
      await opener.evaluate((url) => {
        window.open(url, "xion-dashboard-popup", "width=400,height=600");
      }, popupUrl);
      const popup = await popupPromise;

      await popup.waitForLoadState("domcontentloaded");

      // Assert the popup sees window.opener — this is the channel the
      // dashboard's resolveConnectDeny / resolveSignRejected etc. use to
      // notify the SDK on user cancel.
      const hasOpener = await popup.evaluate(() => window.opener !== null);
      expect(
        hasOpener,
        "popup must have window.opener set (popup-mode rejection path uses it)",
      ).toBe(true);

      // Assert the LoginModal rendered — same pre-auth marker the per-mode
      // mount loop uses, scoped to the popup page this time.
      await popup.waitForFunction(
        () => /Log in\s*\/\s*Sign up/i.test(document.body.innerText ?? ""),
        { timeout: 15_000 },
      );

      await context.close();
    }, 60_000);
  });
});
