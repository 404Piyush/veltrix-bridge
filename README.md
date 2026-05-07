# Veltrix Bridge

User-facing bridge frontend for moving ETH between **Sepolia L1** and **Veltrix L2**.

![Build](https://img.shields.io/github/actions/workflow/status/404Piyush/veltrix-bridge/ci.yml?branch=main&label=build)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Stack](https://img.shields.io/badge/stack-React%20%2B%20Vite-646CFF)

**Live app:** https://veltrix-bridge.vercel.app

## Features

- Connect EIP-1193 wallets (MetaMask-compatible).
- Load ETH balances on Sepolia L1 and Veltrix L2.
- Deposit ETH via `OptimismPortal.depositTransaction`.
- Initiate withdrawals via `L2ToL1MessagePasser.initiateWithdrawal`.
- Track recent submitted bridge transactions with explorer deep links.

## Architecture

```mermaid
flowchart LR
  W[Wallet / EIP-1193] --> UI[Veltrix Bridge UI]
  UI --> L1[Sepolia RPC]
  UI --> L2[Veltrix RPC]
  UI --> OP[OptimismPortal]
  UI --> MP[L2ToL1MessagePasser]
  UI --> EX[Veltrix Explorer]
```

## Tech Stack

### Frontend
- React
- Vite
- Lucide React

### Tooling
- ESLint
- GitHub Actions
- Vercel

## Installation

```bash
git clone https://github.com/404Piyush/veltrix-bridge.git
cd veltrix-bridge
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

Copy `.env.example` and override values only when needed:

```bash
cp .env.example .env.local
```

```env
VITE_L2_RPC_URL=https://veltrix-rpc.404piyush.me
VITE_L2_EXPLORER_URL=https://veltrix-explorer.404piyush.me/tx/
VITE_L2_EXPLORER_ROOT=https://veltrix-explorer.404piyush.me
VITE_L2_NATIVE_NAME=Ether
VITE_L2_NATIVE_SYMBOL=ETH
VITE_L2_NATIVE_DECIMALS=18
```

If your wallet rejects `wallet_addEthereumChain` with a native symbol mismatch for chain `0xa455`, override `VITE_L2_NATIVE_SYMBOL` to the symbol your wallet expects.

## Usage

1. Connect wallet.
2. Load Sepolia and Veltrix balances.
3. Deposit from Sepolia or initiate withdrawal from Veltrix.
4. Open transaction links from the activity panel for chain confirmation.

## Contracts and Network Defaults

| Item | Value |
| --- | --- |
| Sepolia Chain ID | `0xaa36a7` |
| Veltrix L2 Chain ID | `0xa455` |
| OptimismPortal | `0x9d6954E55297f9ae78e5c0dc2353c18b31aeA0b3` |
| L2ToL1MessagePasser | `0x4200000000000000000000000000000000000016` |
| Veltrix RPC | `https://veltrix-rpc.404piyush.me` |
| Veltrix Explorer | `https://veltrix-explorer.404piyush.me` |

## CI

The repository runs CI on pushes and pull requests to `main`:

- `npm run lint`
- `npm run build`

## Deploy

```bash
npm run lint
npm run build
npx vercel --prod
```

## Folder Structure

```text
.
├── .github
│   ├── ISSUE_TEMPLATE
│   └── workflows
├── assets
├── screenshots
├── src
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
└── README.md
```

## Roadmap

- Add withdrawal proof and finalization actions in UI.
- Add on-chain lifecycle state display from chain data.
- Improve transaction history depth and filtering.
- Add domain-level deployment docs and operational runbooks.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Security

See [SECURITY.md](./SECURITY.md).
