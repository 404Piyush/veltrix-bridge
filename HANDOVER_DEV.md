# Veltrix Bridge - Developer Handover

## Current State
- Target network: `Veltrix Sepolia L2`
- Chain ID: `0xce608`
- RPC: `https://veltrix-rpc.404piyush.me`
- Frontend: React + Vite
- Production: Vercel

## Done
1. Aligned bridge config with chain ID `0xce608`.
2. Normalized the native symbol to `VEL` across source and docs.
3. Removed old developer warnings and banner copy from the UI.
4. Verified the frontend can talk to the current Sepolia-backed portal path.
5. Built and deployed the bridge app to production.

## Deployment
- Repo: `404Piyush/veltrix-bridge`
- Required env vars:
  - `VITE_L2_CHAIN_ID=0xce608`
  - `VITE_L2_NATIVE_SYMBOL=VEL`
  - `VITE_L2_RPC_URL=https://veltrix-rpc.404piyush.me`

## Key Files
- `src/App.jsx`: bridge UI and wallet flow
- `README.md`: deployment and runtime notes
- `HANDOVER_DEV.md`: current handoff state

## Remaining
- Verify L1 to L2 deposit flow against the current live chain end to end.
- Add proof and finalization UI for withdrawals.
- Improve error handling and lifecycle status display around deposit/withdraw steps.
