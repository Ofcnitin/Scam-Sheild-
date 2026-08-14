# 🛡️ Scam Shield

> A privacy-first, mobile-first fraud intelligence web app for checking suspicious messages, links and phone numbers.

Scam Shield turns a suspicious message, URL or phone number into an understandable **risk assessment**, explains the signals behind the result, and points users toward legitimate reporting channels.

## ✨ Highlights

- **Message intelligence** — detects OTP/PIN/CVV requests, urgency, impersonation, payment pressure, prize/refund scams and suspicious embedded links.
- **URL intelligence** — local heuristic scoring, phishing database lookup, RDAP registration intelligence, certificate transparency and redirect inspection.
- **Phone intelligence** — international formatting/validation with an India-first experience and optional CallTracer lookup.
- **Explainable verdicts** — every result exposes the signals that influenced the score.
- **Privacy-first by design** — no account, no history database, no tracking requirement and no scan content persistence.
- **Action center** — official India-focused cybercrime reporting resources are always one tap away.
- **Graceful degradation** — unavailable intelligence sources produce an **Unverified** state instead of falsely saying Safe.
- **Responsive UI** — designed around mobile scam-reporting workflows while scaling to desktop.
- **Accessible states** — large targets, clear contrast, keyboard focus, reduced-motion support and readable copy.

## 🧱 Architecture

This repository is intentionally deployable as a static-first web app with optional serverless API routes:

```text
Browser
  │
  ├── Message engine ─────────────── local
  │
  ├── URL engine ─────────────────── local
  │       ├── PhishTank (optional)
  │       ├── RDAP
  │       ├── crt.sh
  │       └── redirect inspection
  │
  └── Phone engine ───────────────── local validation
          └── CallTracer (optional proxy)
```

The `functions/` directory follows the Cloudflare Pages Functions convention. It can be deployed without exposing third-party credentials in browser code.

## 🚀 GitHub / Cloudflare Pages

Upload the repository to GitHub.

For Cloudflare Pages:

- Framework preset: **None**
- Build command: leave empty
- Build output directory: `public`
- Functions: automatically discovered from `/functions`

The UI also runs as a static site without the optional serverless intelligence routes.

## 🔐 Privacy model

Scam Shield does not require an account. The client does not implement a history database. Inputs are processed for the current check and are not intentionally persisted.

Third-party lookups may receive the URL or phone number necessary to perform the requested lookup. The UI clearly distinguishes external intelligence from local analysis.

## ⚠️ Disclaimer

A risk score is an automated signal, not proof of fraud, identity verification, legal advice or forensic evidence. An **Unverified** result does not mean Safe.

Official reporting resources should be rechecked before production releases because government contact information and portal structures can change.
