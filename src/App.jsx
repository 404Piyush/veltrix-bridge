import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  BadgeCheck,
  Clock3,
  Copy,
  ExternalLink,
  Gauge,
  Landmark,
  Layers3,
  ShieldCheck,
  Wallet,
} from "lucide-react";

const BRIDGE_CONFIG = {
  l1ChainId: "0xaa36a7",
  l1ChainName: "Sepolia",
  l1Explorer: "https://sepolia.etherscan.io/tx/",
  l2ChainId: "0xa455",
  l2ChainName: "Veltrix Sepolia L2",
  l2RpcUrl: import.meta.env.VITE_L2_RPC_URL || "https://veltrix-rpc.404piyush.me",
  l2ExplorerUrl: import.meta.env.VITE_L2_EXPLORER_URL || "https://veltrix-explorer.404piyush.me/tx/",
  l2ExplorerRoot: import.meta.env.VITE_L2_EXPLORER_ROOT || "https://veltrix-explorer.404piyush.me",
  optimismPortal: "0x9d6954E55297f9ae78e5c0dc2353c18b31aeA0b3",
  l2ToL1MessagePasser: "0x4200000000000000000000000000000000000016",
  depositGasLimit: 100000n,
  withdrawalGasLimit: 100000n,
};

const statusTone = {
  neutral: "status status--neutral",
  ok: "status status--ok",
  wait: "status status--wait",
  error: "status status--error",
};

const stripHex = (value) => value.replace(/^0x/i, "");
const padWord = (value) => stripHex(value).padStart(64, "0");
const encodeAddress = (address) => padWord(address.toLowerCase());
const encodeUint = (value) => BigInt(value).toString(16).padStart(64, "0");
const encodeBool = (value) => encodeUint(value ? 1n : 0n);

const encodeBytes = (hexValue = "0x") => {
  const bytes = stripHex(hexValue);
  const length = bytes.length / 2;
  const paddedLength = Math.ceil(bytes.length / 64) * 64;
  return `${encodeUint(length)}${bytes.padEnd(paddedLength, "0")}`;
};

const encodeDepositTransaction = ({ to, valueWei, gasLimit }) => {
  const selector = "e9e05c42";
  const bytesOffset = 5n * 32n;
  return `0x${selector}${encodeAddress(to)}${encodeUint(valueWei)}${encodeUint(gasLimit)}${encodeBool(false)}${encodeUint(bytesOffset)}${encodeBytes("0x")}`;
};

const encodeInitiateWithdrawal = ({ to, gasLimit }) => {
  const selector = "c2b3e5ac";
  const bytesOffset = 3n * 32n;
  return `0x${selector}${encodeAddress(to)}${encodeUint(gasLimit)}${encodeUint(bytesOffset)}${encodeBytes("0x")}`;
};

const parseEtherInput = (value) => {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{0,18})?$/.test(trimmed)) {
    throw new Error("Enter a valid ETH amount with up to 18 decimals.");
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const wei = BigInt(whole || "0") * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
  if (wei <= 0n) {
    throw new Error("Enter an amount greater than 0 ETH.");
  }
  return wei;
};

const toQuantityHex = (value) => `0x${BigInt(value).toString(16)}`;

const weiToEth = (wei, digits = 6) => {
  const value = BigInt(wei || 0);
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").slice(0, digits);
  return `${whole}.${fraction}`;
};

const formatAddress = (address, head = 8, tail = 6) => {
  if (!address) return "Not connected";
  return `${address.slice(0, head)}...${address.slice(-tail)}`;
};

const copyText = async (value) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
  }
};

const getWalletProvider = () => {
  if (!window.ethereum) {
    throw new Error("No wallet found. Install MetaMask or another EIP-1193 wallet.");
  }
  return window.ethereum;
};

const switchNetwork = async (chainId) => {
  const provider = getWalletProvider();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    if (error.code !== 4902 || chainId !== BRIDGE_CONFIG.l2ChainId) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: BRIDGE_CONFIG.l2ChainId,
          chainName: BRIDGE_CONFIG.l2ChainName,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [BRIDGE_CONFIG.l2RpcUrl],
          blockExplorerUrls: [BRIDGE_CONFIG.l2ExplorerRoot],
        },
      ],
    });
  }
};

function App() {
  const [account, setAccount] = useState("");
  const [depositAmount, setDepositAmount] = useState("0.0005");
  const [withdrawAmount, setWithdrawAmount] = useState("0.0001");
  const [l1Balance, setL1Balance] = useState("");
  const [l2Balance, setL2Balance] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [status, setStatus] = useState({
    tone: "neutral",
    title: "Bridge ready",
    detail: "Connect wallet, load balances, then submit a deposit or withdrawal.",
  });

  const setBridgeStatus = (tone, title, detail) => {
    setStatus({ tone, title, detail });
  };

  const requestWalletAccount = async () => {
    const provider = getWalletProvider();
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const selectedAccount = accounts[0];
    if (!selectedAccount) {
      throw new Error("No wallet account selected.");
    }
    setAccount(selectedAccount);
    return selectedAccount;
  };

  const getActiveAccount = async () => {
    const provider = getWalletProvider();
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts[0]) {
      setAccount(accounts[0]);
      return accounts[0];
    }
    return requestWalletAccount();
  };

  const connectWallet = async () => {
    try {
      const selectedAccount = await requestWalletAccount();
      setBridgeStatus("ok", "Wallet connected", `${formatAddress(selectedAccount, 10, 8)} is ready.`);
    } catch (error) {
      setBridgeStatus("error", "Wallet connection failed", error.message);
    }
  };

  const addVeltrixNetwork = async () => {
    try {
      const provider = getWalletProvider();
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BRIDGE_CONFIG.l2ChainId,
            chainName: BRIDGE_CONFIG.l2ChainName,
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: [BRIDGE_CONFIG.l2RpcUrl],
            blockExplorerUrls: [BRIDGE_CONFIG.l2ExplorerRoot],
          },
        ],
      });
      setBridgeStatus("ok", "Veltrix L2 added", "Network was added to wallet. You can switch to Veltrix L2 any time.");
    } catch (error) {
      setBridgeStatus("error", "Add network failed", error.message);
    }
  };

  const refreshBalance = async (chainId, setter, label) => {
    try {
      const provider = getWalletProvider();
      const address = await getActiveAccount();
      await switchNetwork(chainId);
      const balance = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      setter(weiToEth(BigInt(balance)));
      setBridgeStatus("ok", `${label} balance loaded`, `${label} balance refreshed for ${formatAddress(address, 10, 8)}.`);
    } catch (error) {
      setBridgeStatus("error", `${label} balance failed`, error.message);
    }
  };

  const addTransaction = (entry) => {
    setTransactions((current) => [entry, ...current].slice(0, 8));
  };

  const submitDeposit = async () => {
    try {
      const provider = getWalletProvider();
      await getActiveAccount();
      await switchNetwork(BRIDGE_CONFIG.l1ChainId);
      const from = await getActiveAccount();
      const valueWei = parseEtherInput(depositAmount);
      const data = encodeDepositTransaction({
        to: from,
        valueWei,
        gasLimit: BRIDGE_CONFIG.depositGasLimit,
      });

      setPendingAction("deposit");
      setBridgeStatus("wait", "Confirm Sepolia deposit", "Approve the OptimismPortal transaction in your wallet.");
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: BRIDGE_CONFIG.optimismPortal,
            value: toQuantityHex(valueWei),
            data,
          },
        ],
      });

      addTransaction({
        type: "L1 deposit",
        hash: txHash,
        href: `${BRIDGE_CONFIG.l1Explorer}${txHash}`,
        detail: `${depositAmount} ETH sent to OptimismPortal`,
      });
      setBridgeStatus("ok", "Deposit submitted", "Wait for Sepolia derivation; L2 balance credits after the deposit block becomes safe.");
    } catch (error) {
      setBridgeStatus("error", "Deposit failed", error.message);
    } finally {
      setPendingAction("");
    }
  };

  const submitWithdrawal = async () => {
    try {
      const provider = getWalletProvider();
      await getActiveAccount();
      await switchNetwork(BRIDGE_CONFIG.l2ChainId);
      const from = await getActiveAccount();
      const valueWei = parseEtherInput(withdrawAmount);
      const data = encodeInitiateWithdrawal({
        to: from,
        gasLimit: BRIDGE_CONFIG.withdrawalGasLimit,
      });

      setPendingAction("withdraw");
      setBridgeStatus("wait", "Confirm L2 withdrawal", "Approve the L2ToL1MessagePasser transaction in your wallet.");
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: BRIDGE_CONFIG.l2ToL1MessagePasser,
            value: toQuantityHex(valueWei),
            data,
          },
        ],
      });

      addTransaction({
        type: "L2 withdrawal",
        hash: txHash,
        href: `${BRIDGE_CONFIG.l2ExplorerUrl}${txHash}`,
        detail: `${withdrawAmount} ETH withdrawal initiated`,
      });
      setBridgeStatus("ok", "Withdrawal initiated", "Next: prove after an output covers this L2 block, then finalize after dispute-game maturity.");
    } catch (error) {
      setBridgeStatus("error", "Withdrawal failed", error.message);
    } finally {
      setPendingAction("");
    }
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar-inner">
          <div className="brand">
            <div className="brand-mark">VX</div>
            <div>
              <div className="brand-title">Veltrix Bridge</div>
              <div className="brand-subtitle">Sepolia ↔ Veltrix L2</div>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#bridge">Bridge</a>
            <a href="#activity">Activity</a>
            <a href={BRIDGE_CONFIG.l2ExplorerRoot} target="_blank" rel="noreferrer">
              Explorer
            </a>
          </nav>
          <div className="navbar-actions">
            <button className="network-button" type="button" onClick={addVeltrixNetwork}>
              Add Veltrix L2
            </button>
            <button className="wallet-button" type="button" onClick={connectWallet}>
              <Wallet size={18} />
              {account ? formatAddress(account, 10, 8) : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        <section className="section card" id="bridge">
          <div className="section-header">
            <div>
              <h1>Bridge ETH between Sepolia and Veltrix L2</h1>
              <p>
                One clean flow: connect wallet, check balances, deposit or withdraw, then track transaction status from the
                activity panel.
              </p>
            </div>
            <div className="network-tags">
              <span>Sepolia L1</span>
              <span>Veltrix L2</span>
            </div>
          </div>

          <div className="section-content">
            <div className="overview-left">
              <div className="eyebrow">
                <ShieldCheck size={15} />
                Bridge controls
              </div>
              <div className="hero-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => refreshBalance(BRIDGE_CONFIG.l1ChainId, setL1Balance, "Sepolia")}
                >
                  Load Sepolia Balance
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => refreshBalance(BRIDGE_CONFIG.l2ChainId, setL2Balance, "Veltrix L2")}
                >
                  Load Veltrix L2 Balance
                </button>
                <a href={BRIDGE_CONFIG.l2ExplorerRoot} target="_blank" rel="noreferrer">
                  Open Veltrix Explorer <ExternalLink size={16} />
                </a>
              </div>
            </div>

            <aside className="status-panel">
              <div className={statusTone[status.tone]}>
                <strong>{status.title}</strong>
                <span>{status.detail}</span>
              </div>
              <div className="balance-grid">
                <BalanceCard icon={Landmark} label="Sepolia" value={l1Balance} detail="L1 wallet balance" />
                <BalanceCard icon={Layers3} label="Veltrix L2" value={l2Balance} detail="L2 wallet balance" />
              </div>
            </aside>
          </div>
        </section>

        <section className="grid-two">
          <BridgeCard
            icon={ArrowDownToLine}
            title="Deposit to Veltrix"
            description="Send ETH from Sepolia into the same wallet on Veltrix L2 through OptimismPortal."
            amount={depositAmount}
            setAmount={setDepositAmount}
            actionLabel="Deposit from Sepolia"
            pending={pendingAction === "deposit"}
            onSubmit={submitDeposit}
          />
          <BridgeCard
            icon={ArrowUpFromLine}
            title="Withdraw to Sepolia"
            description="Initiate an L2 withdrawal now. Proof and finalization follow chain readiness windows."
            amount={withdrawAmount}
            setAmount={setWithdrawAmount}
            actionLabel="Start withdrawal"
            pending={pendingAction === "withdraw"}
            onSubmit={submitWithdrawal}
          />
        </section>

        <section className="grid-two" id="activity">
          <Panel title="Recent Bridge Activity">
            {transactions.length ? (
              <div className="tx-list">
                {transactions.map((tx) => (
                  <a className="tx-row" href={tx.href} target="_blank" rel="noreferrer" key={tx.hash}>
                    <div>
                      <span>{tx.type}</span>
                      <strong>{formatAddress(tx.hash, 12, 10)}</strong>
                      <small>{tx.detail}</small>
                    </div>
                    <ExternalLink size={18} />
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState label="Your submitted bridge transactions will appear here." />
            )}
          </Panel>

          <Panel title="Withdrawal Lifecycle">
            <Step
              icon={BadgeCheck}
              title="1. Initiate withdrawal"
              text="Send your withdrawal transaction on Veltrix L2."
              active
            />
            <Step icon={Gauge} title="2. Wait for output" text="Wait until proposer output includes your withdrawal block." active />
            <Step icon={Clock3} title="3. Prove on Sepolia" text="Prove the withdrawal once output is available." />
            <Step icon={ShieldCheck} title="4. Finalize on Sepolia" text="Finalize after the dispute-game maturity window." />
          </Panel>
        </section>

        <section className="section card">
          <h2>Contracts & RPC</h2>
          <div className="contract-strip">
            <ContractLine label="OptimismPortalProxy" value={BRIDGE_CONFIG.optimismPortal} />
            <ContractLine label="L2ToL1MessagePasser" value={BRIDGE_CONFIG.l2ToL1MessagePasser} />
            <ContractLine label="Veltrix RPC" value={BRIDGE_CONFIG.l2RpcUrl} />
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <span>Veltrix Bridge</span>
          <span>Sepolia L1 ↔ Veltrix L2</span>
          <a href={BRIDGE_CONFIG.l2ExplorerRoot} target="_blank" rel="noreferrer">
            Explorer
          </a>
        </div>
      </footer>
    </div>
  );
}

function BalanceCard({ icon: Icon, label, value, detail }) {
  return (
    <div className="balance-card">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value ? `${value} ETH` : "--"}</strong>
      <small>{detail}</small>
    </div>
  );
}

function BridgeCard({ icon: Icon, title, description, amount, setAmount, actionLabel, pending, onSubmit }) {
  return (
    <article className="bridge-card card">
      <div className="card-heading">
        <div className="card-icon">
          <Icon size={20} />
        </div>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <label>
        Amount
        <div className="amount-input">
          <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" />
          <span>ETH</span>
        </div>
      </label>
      <button className="primary-action" type="button" disabled={pending} onClick={onSubmit}>
        {pending ? "Waiting for wallet..." : actionLabel}
        {!pending && <ArrowRight size={18} />}
      </button>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <article className="panel card">
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function Step({ icon: Icon, title, text, active = false }) {
  return (
    <div className={`step ${active ? "active" : ""}`}>
      <div className="step-dot">
        <Icon size={16} />
      </div>
      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function ContractLine({ label, value }) {
  return (
    <button className="contract-line" type="button" onClick={() => copyText(value)}>
      <span>{label}</span>
      <strong>{value}</strong>
      <Copy size={15} />
    </button>
  );
}

function EmptyState({ label }) {
  return <div className="empty-state">{label}</div>;
}

export default App;
