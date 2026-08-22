# Security Policy

## Supported versions

Only the current production release is supported with security fixes.

| Version | Supported |
|---------|-----------|
| 1.49.x (current) | Yes |
| < 1.49 | No |

---

## Data handled by this extension

| Data | Storage | Transmitted |
|------|---------|-------------|
| Salesforce case data | `chrome.storage.local` only | Never - local only |
| Bob API key (`bobApiKey`) | `chrome.storage.local` only | Localhost only (127.0.0.1:47123) |
| Bob working directory path | `chrome.storage.local` only | Localhost only |
| Cloudability OrgID | `chrome.storage.local` only | Never |
| Workspace profiles (URLs) | `chrome.storage.local` only | Never |
| Activity log / notifications | `chrome.storage.local` only | Never |

**No remote telemetry.** This extension does not transmit any user data to external servers.
All communication with IBM Bob runs over loopback (`127.0.0.1`) only.

---

## Bob Helper server security model

The `tools/bob-helper-server.js` local HTTP server:

- Binds to `127.0.0.1:47123` (loopback only - not accessible outside the local machine)
- CORS policy restricts `Access-Control-Allow-Origin` to the extension origin (`chrome-extension://`) - not a wildcard
- Requires the Bob Helper server to be manually started per session - it is never auto-launched
- Does not persist any state between requests

See [`docs/BOB-HELPER-SERVER.md`](docs/BOB-HELPER-SERVER.md) for the full technical reference.

---

## Extension permissions

The extension requests only the permissions required for its documented functionality.
The current permission set and rationale is recorded in [`manifest.json`](manifest.json).

Permissions were audited and narrowed in v1.45.4:
- `activeTab` removed (superseded by `tabs`)
- `notifications` removed (not used)
- `web_accessible_resources` narrowed to six specific host patterns

---

## Content Security Policy

The extension enforces a strict CSP for extension pages:

```
script-src 'self'; object-src 'none'
```

No inline scripts, no eval, no remote script sources.

---

## Threat model

| Threat | Mitigation |
|--------|-----------|
| API key exfiltration | Key stored in `chrome.storage.local`; transmitted only over loopback |
| Cross-site request to Bob Helper | CORS restricted to extension origin only |
| Malicious extension resource access | `web_accessible_resources` limited to 6 known host patterns |
| Content script injection | Scripts run in ISOLATED world (except Cloudability interceptor in MAIN world for XHR interception) |
| Manifest tampering | `manifest.json` is CODEOWNERS-protected; requires `@jnytko` review on PRs (enforced when branch protection is enabled) |

---

## Reporting a vulnerability

To report a security vulnerability privately (preferred for sensitive disclosures):

**[Report a vulnerability privately](https://github.com/jnytko/Replycators/security/advisories/new)**

This uses GitHub Private Vulnerability Reporting. Your report will be visible only to the repository owner. We aim to acknowledge private reports within 5 business days.

For non-sensitive security observations, open a GitHub Issue with the label `security`. Do not include working exploit code or other sensitive details in public issues.
