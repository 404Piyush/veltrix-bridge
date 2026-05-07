# Veltrix Bridge

Standalone user-facing bridge frontend for the Veltrix Sepolia L2.

## Status

Functional for the first bridge milestone:

```text
Connect wallet -> load balances -> deposit ETH -> initiate withdrawal
```

The UI is intentionally not final. We will come back later for visual polish, indexed transaction tracking, proof actions, and finalization actions.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Optional local env:

```bash
cp .env.example .env.local
```

## Current Scope

- Connect an EIP-1193 wallet such as MetaMask.
- Load Sepolia L1 and Veltrix L2 balances.
- Deposit ETH from Sepolia through `OptimismPortal.depositTransaction`.
- Initiate ETH withdrawals on Veltrix L2 through `L2ToL1MessagePasser.initiateWithdrawal`.

Proof and finalization are still handled by the repo scripts until the next bridge UI milestone.

## Production URLs

The default production config points at the live Veltrix services:

```text
VITE_L2_RPC_URL=https://veltrix-rpc.404piyush.me
VITE_L2_EXPLORER_URL=https://veltrix-explorer.404piyush.me/tx/
VITE_L2_EXPLORER_ROOT=https://veltrix-explorer.404piyush.me
```

For Vercel, set those env vars in the project if overriding defaults. Browsers will block wallet RPC calls from an HTTPS site to an insecure `http://localhost` RPC.

## Deploy

```bash
npm run lint
npm run build
npx vercel --prod
```
