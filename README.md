# 🛡️ Scam Shield

### Message, URL & Phone Number Fraud Detection

Scam Shield is a privacy-conscious web application that helps users assess suspicious messages, links, and phone numbers before taking action.

Paste a suspicious message, URL, or phone number and receive an explainable risk assessment with detected warning signals, supporting intelligence, and guidance on what to do next.

🌐 **Live Web App:** https://scam-sheild.ofcnitin.workers.dev  
💻 **GitHub:** https://github.com/Ofcnitin/Scam-Sheild

---

## ✨ Features

### 💬 Message Scanner

Analyze suspicious SMS, WhatsApp messages, emails, and other text for common scam patterns.

- OTP, PIN, CVV and password requests
- Urgency and threat language
- Account suspension and payment warnings
- Prize, lottery and refund scams
- Bank, government and delivery-service impersonation
- Suspicious URLs and phone numbers embedded in messages
- Explainable risk indicators
- Safe / Caution / High Risk verdicts

### 🔗 URL Scanner

Inspect suspicious links before opening them.

- HTTPS and URL structure analysis
- Suspicious domain and path detection
- IP-address URLs
- Punycode and lookalike-domain detection
- Phishing-style keywords
- Redirect analysis
- Domain registration intelligence
- Certificate Transparency checks
- Threat-intelligence checks where available
- Unverified state when sufficient evidence is unavailable

### 📱 Phone Number Checker

Analyze phone numbers and available carrier/community information.

- International number formatting
- India `+91` support
- Mobile / landline / VoIP classification
- Carrier information when available
- Location information when available
- Spam and community signals
- Partial-result handling
- Clear distinction between community information and verified identity

### 🚨 Report & Legal Resources

A dedicated reporting section provides legitimate resources and guidance for users who encounter or fall victim to scams.

Includes:

- Cybercrime reporting
- Financial fraud reporting
- Spam/fraud call and SMS reporting
- Emergency assistance
- State/UT cybercrime resources
- Evidence collection guidance

---

## 🎯 Risk Model

Scam Shield intentionally avoids presenting automated analysis as absolute truth.

| Verdict | Meaning |
|---|---|
| 🟢 **Safe / Low Risk** | No significant suspicious indicators were detected |
| 🟡 **Caution** | Suspicious signals were detected, but evidence is inconclusive |
| 🔴 **High Risk** | Strong or multiple fraud indicators were detected |
| ⚪ **Unverified** | Available sources could not establish enough evidence |

> **No evidence does not mean guaranteed safe. Unverified does not mean scam.**

Results are risk indicators, not forensic proof, identity verification, or a legal determination.

---

## 🔐 Privacy First

Scam Shield is designed around minimal data exposure.

- No account required
- No login required
- No permanent message storage by the frontend
- No selling of submitted data
- Analysis occurs only when requested
- External intelligence may be queried when required for a check

**Never submit passwords, OTPs, CVVs, private keys, or other sensitive credentials.**

---

## 🏗️ Architecture

```text
┌──────────────────────────────┐
│        Scam Shield UI        │
│     HTML / CSS / JavaScript  │
└──────────────┬───────────────┘
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
   Message     URL     Phone
   Analysis   Engine   Lookup
       │       │        │
       │       ├── Threat Intelligence
       │       ├── RDAP
       │       ├── Certificate Transparency
       │       └── Redirect Analysis
       │
       └──────── Risk Engine
                    │
                    ▼
             Explainable Verdict

The application uses a Cloudflare Worker layer for server-side API operations while serving the web interface as static assets.


---

🧰 Technology

HTML5

CSS3

Vanilla JavaScript

Cloudflare Workers

Cloudflare Static Assets

GitHub

RDAP

Certificate Transparency data

Threat-intelligence sources

Phone/carrier intelligence providers


The project intentionally uses a lightweight architecture without requiring a frontend framework.


---

📁 Project Structure

Scam-Sheild/
├── functions/
│   └── api/
│       ├── phone.js
│       └── url.js
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── src/
│   └── index.js
│
├── wrangler.jsonc
├── .gitignore
├── LICENSE
└── README.md


---

⚡ Getting Started

Clone

git clone https://github.com/Ofcnitin/Scam-Sheild.git
cd Scam-Sheild

Install Wrangler

npm install -D wrangler

Run locally

npx wrangler dev

Open the local URL provided by Wrangler.


---

🚀 Deployment

Scam Shield is configured for deployment using Cloudflare Workers.

npx wrangler deploy

The repository can also be connected to Cloudflare for automatic deployments whenever changes are pushed to GitHub.

Live Application

🌐 https://scam-sheild.ofcnitin.workers.dev


---

🧪 Testing

Scam Shield can be tested using controlled examples representing:

OTP scams

Account suspension scams

Fake refunds

Prize/lottery scams

Delivery impersonation

Suspicious URLs

IP-based URLs

Phishing-style URL paths

Unknown phone numbers

Numbers without verified community reports


Test data should never contain real credentials or sensitive personal information.


---

⚠️ Disclaimer

Scam Shield is an informational security tool.

Its results are risk assessments, not guarantees.

A low-risk or unverified result does not prove that a message, URL, or phone number is legitimate. Likewise, a high-risk result does not constitute legal or forensic proof.

Users should independently verify important communications and report confirmed fraud through official channels.

Scam Shield does not file complaints on behalf of users and is not a law-enforcement service.


---

🗺️ Roadmap

[x] Message scam detection

[x] URL analysis

[x] Phone number analysis

[x] Explainable risk verdicts

[x] Reporting resources

[x] Mobile-first interface

[x] Cloudflare Worker deployment

[ ] Expanded threat-intelligence providers

[ ] Improved multilingual scam detection

[ ] User feedback and false-positive tracking

[ ] Advanced scam classification

[ ] Optional client-side history

[ ] Additional country-specific reporting resources



---

🤝 Contributing

Contributions, suggestions, bug reports, and improvements are welcome.

If you find a problem:

1. Open an issue


2. Describe the behavior


3. Include reproducible steps


4. Never include passwords, OTPs, financial information, or private communications




---

📄 License

See LICENSE for the project's license.


---

<div align="center">🛡️ Scam Shield

Check before you click. Verify before you trust. Report when necessary.

🌐 Live App: https://scam-sheild.ofcnitin.workers.dev

💻 GitHub: https://github.com/Ofcnitin/Scam-Sheild

</div>
```