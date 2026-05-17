# DomainForge 🌐

A full-stack domain registrar & hosting service platform — built on Base44, powered by Deno backend functions.

## Features

- 🔍 **Domain Search** — Real-time availability checking across 19+ TLDs
- 🛒 **Domain Registration** — Full registration flow with checkout
- 🌐 **DNS Management** — A, AAAA, CNAME, MX, TXT, NS, SRV, CAA records
- 🖥️ **Hosting Plans** — 4 tiered plans with monthly/yearly billing
- 📊 **User Dashboard** — Domain portfolio, hosting accounts, order history
- 👑 **Owner Panel** — Device-locked admin panel with full platform control
- 💻 **Termux Bridge** — Link Termux on Android to control the platform remotely
- 💳 **Checkout Flow** — Multi-step checkout with order processing

## Owner Panel

The Owner Panel (`/owner`) is restricted to:
1. Users with `admin` role
2. Approved devices (verified by browser fingerprint)

### Owner Panel Sections
| Section | Description |
|---|---|
| Overview | Platform analytics, revenue, recent orders |
| Branding | Site name, tagline, colors, logo — with live preview |
| Backend Config | API provider, Stripe keys, registrar credentials |
| Device Management | Approve/revoke devices for Owner Panel access |
| Termux Bridge | Generate tokens, manage sessions, view usage guide |
| Users | View and manage all platform users |
| All Domains | View every registered domain across all users |
| Orders | Full order history with status |

## Termux Integration

Generate a session token from the Owner Panel → Termux Bridge, then in Termux:

```bash
pkg install curl jq

export REGISTRAR_TOKEN="your_token_here"
export REGISTRAR_URL="https://your-app.base44.app/functions"

# Test connection
curl -s -X POST "$REGISTRAR_URL/termuxBridge" \
  -H "Content-Type: application/json" \
  -d '{"action":"ping","session_token":"'$REGISTRAR_TOKEN'"}' | jq
```

## Backend Functions

| Function | Description |
|---|---|
| `domainSearch` | Domain availability search across TLDs |
| `ownerAuth` | Device approval, registration, revocation |
| `ownerConfig` | Platform configuration CRUD |
| `termuxBridge` | Termux session management |

## Entities

| Entity | Description |
|---|---|
| `Domain` | Registered domains with metadata |
| `DnsRecord` | DNS records per domain |
| `HostingPlan` | Available hosting plans |
| `HostingAccount` | User hosting accounts |
| `Order` | Order history |
| `OwnerConfig` | Platform configuration key-value store |
| `ApprovedDevice` | Owner-approved devices for panel access |
| `TermuxSession` | Active Termux bridge sessions |

## CI/CD

The `.github/workflows/build.yml` pipeline includes:
- **Lint & Type Check** — ESLint, TypeScript
- **Build** — Production Vite build with artifact upload
- **Deno Validation** — Syntax check all backend functions
- **Security Audit** — npm audit + secret scanning
- **Staging Deploy** — Auto-deploy on `develop` push
- **Production Deploy** — Auto-deploy on `main` push with GitHub Release

## Setup

### Required GitHub Secrets
```
BASE44_APP_ID         - Your Base44 app ID
CLOUDFLARE_API_TOKEN  - For deployment (optional)
CLOUDFLARE_ACCOUNT_ID - For deployment (optional)
```

### Environment Variables (Owner Config)
Set these via the Owner Panel → Backend Configuration:
- `registrar_api_provider` — `sandbox` | `namecheap` | `opensrs` | `enom`
- `registrar_api_key` — Your reseller API key
- `stripe_publishable_key` — Stripe public key
- `stripe_secret_key` — Stripe secret key

## Tech Stack

- **Frontend:** React, Tailwind CSS, React Router
- **Backend:** Deno (TypeScript), Base44 SDK
- **Database:** Base44 entities (managed)
- **Auth:** Base44 auth with role-based access
- **CI/CD:** GitHub Actions

---

Built with ❤️ on [Base44](https://base44.com)
