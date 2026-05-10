# Veltrix Bridge - Developer Handover

## 🌉 Application State
- **Target Network:** Veltrix Sepolia L2
- **Chain ID:** `0xce608`
- **RPC:** `https://veltrix-rpc.404piyush.me`

## 🛠️ Recent Changes
1. **Network Alignment:** Updated `VITE_L2_CHAIN_ID` to `0xce608` across all config files.
2. **UI Cleanup:** Removed hardcoded developer warnings and obstructive chain-id banners from `src/App.jsx`.
3. **OptimismPortal Update:** Verified frontend connects to the newly deployed Portal on Sepolia.
4. **Production Build:** A fresh `npm run build` has been generated and validated.

## 🚀 Deployment
- **Repo:** `404Piyush/veltrix-bridge`
- **Frontend:** React + Vite.
- **Env Vars:** Ensure `VITE_L2_CHAIN_ID=0xce608` and `VITE_L2_NATIVE_SYMBOL=VEL` are set in your CI/CD (Vercel).

## 🚧 Next for Dev
- Verify L1 -> L2 deposit flow using the updated UI.
- Test the "Withdrawal Lifecycle" panel once the Proposer has posted the first few output roots.
