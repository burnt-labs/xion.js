# Security Policy

This repository holds the Abstraxion meta account client library — the
published `@burnt-labs/*` packages that form the **Client SDK** asset in the
[Applications and SDKs bug bounty program](https://github.com/burnt-labs/bug-bounty/blob/main/programs/applications.md).
This policy is built from that program's terms.
[`burnt-labs/bug-bounty`](https://github.com/burnt-labs/bug-bounty) remains the
canonical source — where this file and the program documents differ, the
program documents govern.

## Reporting a Vulnerability

**Do not open a public GitHub issue for a security vulnerability.** Public
disclosure before a patch is available increases the harm to users.

| Type of finding                  | How to report                                                       |
| -------------------------------- | ------------------------------------------------------------------- |
| Security vulnerability           | **Security → Report a vulnerability** on this repository, or email [security@burnt.com](mailto:security@burnt.com) |
| Non-sensitive or operational bug | Open a GitHub issue on this repository                              |

Prefer GitHub private vulnerability reporting: the fix is developed against the
report, and you are credited on the published advisory and in any CVE we
request.

Findings in the **hosted applications** (`app.burnt.com`, `auth.burnt.com`,
the account abstraction API) belong to the same program but should go to
[security@burnt.com](mailto:security@burnt.com) — see the program document for
their scope table and authorized testing hostnames.

We acknowledge receipt within **5 business days** and provide a triage decision
within **14 days**. Active exploitation, or confirmed attacker awareness of an
unpatched vulnerability, escalates the issue to Critical handling regardless of
its original classification.

## Scope

**Only the published package code is in scope.** Example apps, demos, and test
fixtures in this repository are not. A finding must be exploitable in a dApp
that consumes a `@burnt-labs/*` package as released on npm, not only in a
local checkout with modified configuration. Package versions that are not the
current release are out of scope.

## Severity

`xion.js` is a library: the consumer is a developer, and the victim is that
developer's user. Severity is assessed on what a **correctly-integrated dApp**
is exposed to.

A finding is severity-rated only if it is exploitable against an integration
that follows the documented usage. A weakness that requires the consuming dApp
to misuse the API, disable a documented safeguard, or supply
attacker-controlled values where the documentation calls for trusted ones is
capped at **Low** — that is a documentation gap, and we would still like to
know, but the defect is in the integration rather than the package.

Signing, session key handling, and transaction construction are the paths that
carry High and Critical. A flaw that causes a dApp to sign a payload other
than the one presented to the user, that leaks or extends the life of a
session key, or that lets a third party influence transaction contents,
qualifies regardless of how many dApps are known to be affected.

Only **High** and **Critical** findings are reward eligible. Collecting a
bounty requires completing a KYC process; we cannot pay reporters in
sanctioned jurisdictions. Where several reports describe the same underlying
issue, the first complete report with a working proof of concept is the one
considered. We assess reports as submitted; we do not reclassify a report to a
different severity on a reporter's behalf.

## Proof of Concept

The proof of concept is a **minimal dApp that consumes the published package**
and exhibits the defect, plus the package version and the integration code.
State which `@burnt-labs/*` package and version you tested. A diff against the
repository, or a description of the flawed code path without a running
integration that exercises it, is not sufficient on its own.

**Do not test or demonstrate against production systems.** Use a local
environment or infrastructure you control; testing production disqualifies the
report.

## Out of Scope

**Assets and environments**

- Example apps, demos, and test fixtures in this repository, and any
  `@burnt-labs/*` package version that is not the current release
- Third-party dApps built with `xion.js`
- Hosted applications and web properties — covered by the
  [Applications and SDKs](https://github.com/burnt-labs/bug-bounty/blob/main/programs/applications.md)
  and [Websites](https://github.com/burnt-labs/bug-bounty/blob/main/programs/websites.md)
  programs under their own scope tables
- Chain node and smart contract findings — see the
  [Blockchain / DLT](https://github.com/burnt-labs/bug-bounty/blob/main/programs/blockchain.md)
  and [Core Protocol Contracts](https://github.com/burnt-labs/bug-bounty/blob/main/programs/contracts.md)
  programs
- Third-party services and upstream dependencies

**Vulnerability classes**

- Clickjacking. Transaction signing provides a second confirmation layer that
  mitigates the attack surface
- Open redirects after authentication that do not leak tokens or credentials
- Self-XSS requiring the attacker to execute code in their own browser session
- Issues requiring physical access to the victim's device
- Social engineering
- Denial of service
- Missing security headers where no exploitable impact is demonstrated
- Theoretical vulnerabilities without a demonstrated attack path and measurable
  user impact
- Best practices and informational findings

## Responsible Disclosure

- Do not exploit a vulnerability beyond what is necessary to confirm it exists
- **Do not test against production systems.** This includes XION mainnet and
  live production web properties
- Do not access, modify, or exfiltrate user data
- Do not disrupt or degrade our networks, data, or services
- Do not disclose publicly before a fix is confirmed and deployed
- Allow us reasonable time to address the issue

## Safe Harbor

Burnt Labs will not pursue legal action against researchers who report
vulnerabilities in good faith under this policy, do not exploit beyond what is
necessary to confirm the finding, do not access or disclose user data, and do
not disrupt production systems.

Authorization to actively test extends only to local environments and
infrastructure you control. Reporting a vulnerability you encountered
incidentally is always welcome.
