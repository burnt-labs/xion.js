#!/usr/bin/env bash
# Validates that a deployed XION dashboard URL serves the expected SPA shell
# and contract-relevant headers.
#
# Usage:   validate-dashboard-shell.sh <URL>
# Env:     BLOCKING=true|false   (default: true)
#
# Behavior:
#   BLOCKING=true   -> on any issue: emit ::error::, exit 1 immediately
#                     (matches the gating-test contract)
#   BLOCKING=false  -> on any issue: emit ::warning::, continue collecting,
#                     exit 0 at the end. Sets GITHUB_OUTPUT had_warnings=true
#                     and warning_summary=<bullet-list> so a follow-up job
#                     can post a PR comment without making the run red.
#
# Non-blocking mode exists so the mainnet contract check shows up as a
# green check + yellow annotations (not a red ❌) — engineers shouldn't see
# a failed-looking job for a non-blocking signal.

set -uo pipefail

URL=${1:?"usage: validate-dashboard-shell.sh <URL>"}
BLOCKING=${BLOCKING:-true}

ISSUES=()

emit_issue() {
  local msg=$1
  ISSUES+=("$msg")
  if [ "$BLOCKING" = "true" ]; then
    echo "::error::$msg"
  else
    echo "::warning::$msg"
  fi
}

# Used at the end to expose collected warnings to a downstream comment job.
# No-op in blocking mode (we'd have already exited 1 on the first issue).
finalize_outputs() {
  if [ "$BLOCKING" = "true" ]; then
    return 0
  fi
  if [ -z "${GITHUB_OUTPUT:-}" ]; then
    return 0
  fi
  if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "had_warnings=false" >> "$GITHUB_OUTPUT"
    return 0
  fi
  echo "had_warnings=true" >> "$GITHUB_OUTPUT"
  {
    echo "warning_summary<<__EOF__"
    for issue in "${ISSUES[@]}"; do
      echo "- $issue"
    done
    echo "__EOF__"
  } >> "$GITHUB_OUTPUT"
}

# Convenience: emit an issue and (in blocking mode) exit. In non-blocking
# mode the caller should usually `return 1` from the surrounding code so it
# can skip dependent checks.
fail_blocking_or_continue() {
  emit_issue "$1"
  if [ "$BLOCKING" = "true" ]; then
    exit 1
  fi
}

echo "Validating: $URL  (BLOCKING=$BLOCKING)"

BODY=$(mktemp)
HEADERS=$(mktemp)

if ! STATUS=$(curl -sSL --max-time 30 \
    -o "$BODY" \
    -D "$HEADERS" \
    -w "%{http_code} %{url_effective}" \
    "$URL"); then
  fail_blocking_or_continue "Could not reach dashboard at $URL"
  finalize_outputs
  exit 0
fi

CODE="${STATUS%% *}"
FINAL_URL="${STATUS#* }"
echo "Final URL:    $FINAL_URL"
echo "Final status: $CODE"

BODY_USABLE=true

if [ "$CODE" != "200" ]; then
  fail_blocking_or_continue "Dashboard returned HTTP $CODE (expected 200) at $FINAL_URL"
  BODY_USABLE=false
fi

case "$FINAL_URL" in
  https://*) ;;
  *)
    fail_blocking_or_continue "Dashboard redirected to non-HTTPS URL: $FINAL_URL"
    ;;
esac

if [ "$BODY_USABLE" = "true" ]; then
  MARKER_MISSING=0
  for marker in '<title>Abstraxion' 'id="root"' '/assets/'; do
    if ! grep -qF "$marker" "$BODY"; then
      MARKER_MISSING=1
      if [ "$BLOCKING" = "true" ]; then
        echo "::error::Dashboard HTML missing expected marker: $marker"
        echo "--- response body (first 80 lines) ---"
        head -n 80 "$BODY"
        exit 1
      fi
      emit_issue "Dashboard HTML missing expected marker: $marker"
    fi
  done
  if [ "$MARKER_MISSING" = "0" ]; then
    echo "✅ SPA shell markers present (title, root div, /assets/ bundle reference)"
  fi
fi

# Frame-embedding headers — the dashboard MUST be embeddable in an iframe by
# any origin (used by AbstraxionEmbed/inline mode). A regression here would
# break every dApp using the embed.
FRAME_OK=true
if ! grep -qiE '^content-security-policy:.*frame-ancestors[[:space:]]+\*' "$HEADERS" \
   && ! grep -qiE '^content-security-policy:.*frame-ancestors[[:space:]]+https?:' "$HEADERS"; then
  CSP_DETAIL=$(grep -i 'content-security-policy\|x-frame-options' "$HEADERS" | tr -d '\r' | paste -sd '; ' - || true)
  fail_blocking_or_continue "Dashboard is missing a permissive frame-ancestors CSP — iframe embedding will break ($CSP_DETAIL)"
  FRAME_OK=false
fi
if grep -qiE '^x-frame-options:[[:space:]]*(deny|sameorigin)' "$HEADERS"; then
  fail_blocking_or_continue "Dashboard sets X-Frame-Options DENY/SAMEORIGIN — iframe embedding will break"
  FRAME_OK=false
fi
if [ "$FRAME_OK" = "true" ]; then
  echo "✅ Frame-embedding headers permit cross-origin embedding"
fi

# connect-src heads-up (always non-fatal — explicit host allowlists are
# legitimate hardening; only the strictest forms warrant a warning).
CSP_LINE=$(grep -i '^content-security-policy:' "$HEADERS" | head -n1 || true)
if [ -n "$CSP_LINE" ]; then
  CSP_VALUE=$(echo "$CSP_LINE" | sed -E 's/^[Cc]ontent-[Ss]ecurity-[Pp]olicy:[[:space:]]*//')
  CONNECT_SRC=$(echo "$CSP_VALUE" | tr ';' '\n' | grep -i '^[[:space:]]*connect-src' | head -n1 || true)
  if [ -n "$CONNECT_SRC" ]; then
    if echo "$CONNECT_SRC" | grep -qiE "connect-src[[:space:]]+'self'[[:space:]]*$" \
       || echo "$CONNECT_SRC" | grep -qiE "connect-src[[:space:]]+'none'"; then
      echo "::warning::Dashboard CSP connect-src is restrictive ($CONNECT_SRC) — verify SDK API calls (RPC/REST/AA-API) are still permitted"
    else
      echo "ℹ️  CSP connect-src present: $CONNECT_SRC"
    fi
  fi
fi

# Asset chain integrity — HEAD every distinct /assets/*.js the SPA references,
# not just the first. Catches partial deploys / stale chunk removals.
if [ "$BODY_USABLE" = "true" ]; then
  BUNDLES=$(grep -oE '/assets/[A-Za-z0-9._-]+\.js' "$BODY" | sort -u)
  if [ -z "$BUNDLES" ]; then
    fail_blocking_or_continue "Could not extract any JS asset reference from the SPA shell"
  else
    BASE_URL="${FINAL_URL%/}"
    BUNDLE_COUNT=0
    BUNDLE_FAILED=0
    while IFS= read -r BUNDLE; do
      [ -z "$BUNDLE" ] && continue
      BUNDLE_COUNT=$((BUNDLE_COUNT + 1))
      BUNDLE_URL="${BASE_URL}${BUNDLE}"
      BUNDLE_HEADERS=$(mktemp)
      BUNDLE_CODE=$(curl -sSL --max-time 30 -I -o "$BUNDLE_HEADERS" -w "%{http_code}" "$BUNDLE_URL")
      if [ "$BUNDLE_CODE" != "200" ]; then
        fail_blocking_or_continue "JS bundle $BUNDLE_URL returned HTTP $BUNDLE_CODE"
        BUNDLE_FAILED=1
      elif ! grep -qiE '^content-type:[[:space:]]*(application|text)/javascript' "$BUNDLE_HEADERS"; then
        CT=$(grep -i '^content-type:' "$BUNDLE_HEADERS" | tr -d '\r' || true)
        fail_blocking_or_continue "JS bundle $BUNDLE_URL has wrong content-type: $CT"
        BUNDLE_FAILED=1
      fi
    done <<< "$BUNDLES"
    if [ "$BUNDLE_FAILED" = "0" ]; then
      echo "✅ All $BUNDLE_COUNT JS bundle reference(s) reachable"
    fi
  fi
fi

finalize_outputs

if [ "$BLOCKING" = "true" ] && [ ${#ISSUES[@]} -gt 0 ]; then
  exit 1
fi

exit 0
