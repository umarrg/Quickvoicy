# ⚡ Quickvoicy

**FREE Lightning-fast invoicing for freelancers via NWC**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NWC](https://img.shields.io/badge/NWC-Integrated-orange.svg)](https://nwc.dev)
[![Lightning](https://img.shields.io/badge/Lightning-Ready-yellow.svg)](https://lightning.network)
[![Fee](https://img.shields.io/badge/Fees-0%25-brightgreen.svg)](https://github.com/yourusername/quickvoicy)

## 🎯 Problem Statement

Freelancers lose thousands annually to payment friction:
- Traditional platforms charge 3-5% fees
- Payment delays average 30+ days globally
- International transfers add extra costs
- No Lightning integration in existing tools

## 💡 Solution

Quickvoicy bridges professional invoicing with instant Lightning payments through NWC integration - **100% FREE, FOREVER**:

- **Zero fees**: No transaction fees, no subscriptions, no hidden costs
- **One-command invoicing**: `/new 1000 "Logo design"` generates professional PDF + Lightning invoice
- **Multi-platform**: Web app, Telegram bot, Discord bot - meet freelancers where they work
- **Instant payments**: NWC enables direct wallet connections for immediate settlements
- **Professional PDFs**: Client-ready invoices with QR codes and payment links
- **Bookkeeping built-in**: Automatic tracking of earnings and payment statistics

### 🆓 Why Free?
We believe financial freedom tools should be free. Quickvoicy is funded by grants and donations, not by taking a cut of your hard-earned money.

## 🔧 NWC Integration

ZapInvoice leverages Nostr Wallet Connect for:
- Secure wallet connections without exposing keys
- Direct invoice generation in user's Lightning node
- Real-time payment status updates
- Multi-wallet support (Alby, Zeus, Mutiny)

[See detailed NWC implementation →](docs/NWC_INTEGRATION.md)

## 🚀 Quick Start

### Web App
```bash
cd web
npm install
npm run dev
