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
import { ethers } from "ethers";

const BRIDGE_CONFIG = {
  l1ChainId: "0xaa36a7",
  l1ChainName: "Sepolia",
  l1RpcUrl: import.meta.env.VITE_L1_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  l1Explorer: "https://sepolia.etherscan.io/tx/",
  l2ChainId: import.meta.env.VITE_L2_CHAIN_ID || "0xce608",
  l2ChainName: "Veltrix Sepolia L2",
  l2RpcUrl: import.meta.env.VITE_L2_RPC_URL || "https://veltrix-rpc.404piyush.me",
  l2ExplorerUrl: import.meta.env.VITE_L2_EXPLORER_URL || "https://veltrix-explorer.404piyush.me/tx/",
  l2ExplorerRoot: import.meta.env.VITE_L2_EXPLORER_ROOT || "https://veltrix-explorer.404piyush.me",
  l2NativeName: import.meta.env.VITE_L2_NATIVE_NAME || "Veltrix",
  l2NativeSymbol: import.meta.env.VITE_L2_NATIVE_SYMBOL || "VEL",
  l2NativeDecimals: Number(import.meta.env.VITE_L2_NATIVE_DECIMALS || "18"),
  optimismPortal: import.meta.env.VITE_OPTIMISM_PORTAL || "0x229Fa2F406ff759Bc763988b4c3CBbbC2C5e0934",
  l2ToL1MessagePasser: import.meta.env.VITE_L2_MESSAGE_PASSER || "0x4200000000000000000000000000000000000016",
  depositGasLimit: 100000n,
  withdrawalGasLimit: 100000n,
};

const MESSAGE_PASSED_TOPIC = ethers.id("MessagePassed(uint256,address,address,uint256,uint256,bytes,bytes32)");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const portalAbi = [
  "function finalizedWithdrawals(bytes32) view returns (bool)",
  "function provenWithdrawals(bytes32,address) view returns (address disputeGameProxy, uint64 timestamp)",
  "function respectedGameType() view returns (uint32)",
  "function disputeGameFactory() view returns (address)",
  "function checkWithdrawal(bytes32,address) view",
  "function proveWithdrawalTransaction((uint256 nonce,address sender,address target,uint256 value,uint256 gasLimit,bytes data) _tx,uint256 _disputeGameIndex,(bytes32 version,bytes32 stateRoot,bytes32 messagePasserStorageRoot,bytes32 latestBlockhash) _outputRootProof,bytes[] _withdrawalProof)",
  "function finalizeWithdrawalTransaction((uint256 nonce,address sender,address target,uint256 value,uint256 gasLimit,bytes data) _tx)",
];

const disputeFactoryAbi = [
  "function gameCount() view returns (uint256)",
  "function findLatestGames(uint32,uint256,uint256) view returns ((uint256 index,bytes32 metadata,uint64 timestamp,bytes32 rootClaim,bytes extraData)[])",
];

const messagePasserIface = new ethers.Interface([
  "event MessagePassed(uint256 indexed nonce,address indexed sender,address indexed target,uint256 value,uint256 gasLimit,bytes data,bytes32 withdrawalHash)",
]);

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
    throw new Error(`Enter a valid ${BRIDGE_CONFIG.l2NativeSymbol} amount with up to 18 decimals.`);
  }

  const [whole, fraction = ""] = trimmed.split(".");
  const wei = BigInt(whole || "0") * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
  if (wei <= 0n) {
    throw new Error(`Enter an amount greater than 0 ${BRIDGE_CONFIG.l2NativeSymbol}.`);
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

const alertSuccess = (title, txHash, explorerUrl) => {
  if (typeof window === "undefined") return;
  const txLink = `${explorerUrl}${txHash}`;
  window.alert(`${title}\n\nTx: ${txHash}\n\nExplorer: ${txLink}`);
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

const buildL2ChainParams = (symbol = BRIDGE_CONFIG.l2NativeSymbol) => ({
  chainId: BRIDGE_CONFIG.l2ChainId,
  chainName: BRIDGE_CONFIG.l2ChainName,
  nativeCurrency: {
    name: BRIDGE_CONFIG.l2NativeName,
    symbol,
    decimals: BRIDGE_CONFIG.l2NativeDecimals,
  },
  rpcUrls: [BRIDGE_CONFIG.l2RpcUrl],
  blockExplorerUrls: [BRIDGE_CONFIG.l2ExplorerRoot],
});

const addL2ChainToWallet = async (provider, symbol = BRIDGE_CONFIG.l2NativeSymbol) => {
  await provider.request({
    method: "wallet_addEthereumChain",
    params: [buildL2ChainParams(symbol)],
  });
  return symbol;
};

const switchNetwork = async (chainId) => {
  const provider = getWalletProvider();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
    return { added: false, symbol: null };
  } catch (error) {
    if (error.code !== 4902 || chainId !== BRIDGE_CONFIG.l2ChainId) {
      throw error;
    }

    const symbol = await addL2ChainToWallet(provider, BRIDGE_CONFIG.l2NativeSymbol);
    return { added: true, symbol };
  }
};

const rpcJson = async (url, method, params = []) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!response.ok) {
    throw new Error(`RPC ${method} failed: HTTP ${response.status}`);
  }
  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message || `RPC ${method} error`);
  }
  return body.result;
};

const toBlockTag = (n) => `0x${BigInt(n).toString(16)}`;

const makeWithdrawalHash = (wdTx) => {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "address", "address", "uint256", "uint256", "bytes"],
    [wdTx.nonce, wdTx.sender, wdTx.target, wdTx.value, wdTx.gasLimit, wdTx.data],
  );
  return ethers.keccak256(encoded);
};

const parseWithdrawalFromReceipt = (receipt) => {
  const log = receipt.logs.find(
    (entry) =>
      entry.address?.toLowerCase() === BRIDGE_CONFIG.l2ToL1MessagePasser.toLowerCase() &&
      entry.topics?.[0]?.toLowerCase() === MESSAGE_PASSED_TOPIC.toLowerCase(),
  );
  if (!log) {
    throw new Error("MessagePassed log not found in withdrawal tx receipt.");
  }
  const parsed = messagePasserIface.parseLog({ topics: log.topics, data: log.data });
  const wdTx = {
    nonce: parsed.args.nonce,
    sender: parsed.args.sender,
    target: parsed.args.target,
    value: parsed.args.value,
    gasLimit: parsed.args.gasLimit,
    data: parsed.args.data,
  };
  return {
    wdTx,
    withdrawalHash: makeWithdrawalHash(wdTx),
    l2BlockNumber: BigInt(receipt.blockNumber),
  };
};

const getLifecycleFromChain = async ({ withdrawalTxHash, account }) => {
  const l1Provider = new ethers.JsonRpcProvider(BRIDGE_CONFIG.l1RpcUrl);
  const portal = new ethers.Contract(BRIDGE_CONFIG.optimismPortal, portalAbi, l1Provider);

  const l2Receipt = await rpcJson(BRIDGE_CONFIG.l2RpcUrl, "eth_getTransactionReceipt", [withdrawalTxHash]);
  if (!l2Receipt) {
    throw new Error("Withdrawal transaction receipt not found on L2 yet.");
  }

  const parsed = parseWithdrawalFromReceipt(l2Receipt);
  const finalized = await portal.finalizedWithdrawals(parsed.withdrawalHash);

  const respectedGameType = await portal.respectedGameType();
  const disputeFactoryAddress = await portal.disputeGameFactory();
  const disputeFactory = new ethers.Contract(disputeFactoryAddress, disputeFactoryAbi, l1Provider);
  const gameCount = await disputeFactory.gameCount();

  if (gameCount === 0n) {
    return {
      ...parsed,
      respectedGameType,
      disputeFactoryAddress,
      proveReady: false,
      finalizeReady: false,
      proveReason: "No dispute game published yet.",
      finalizeReason: "Not proven yet.",
      finalized,
      proven: false,
    };
  }

  const latestGames = await disputeFactory.findLatestGames(respectedGameType, gameCount - 1n, 1n);
  if (!latestGames.length) {
    return {
      ...parsed,
      respectedGameType,
      disputeFactoryAddress,
      proveReady: false,
      finalizeReady: false,
      proveReason: "No respected dispute game found yet.",
      finalizeReason: "Not proven yet.",
      finalized,
      proven: false,
    };
  }

  const game = latestGames[0];
  const gameL2Block = BigInt(game.extraData.slice(0, 66));
  if (parsed.l2BlockNumber > gameL2Block) {
    return {
      ...parsed,
      respectedGameType,
      disputeFactoryAddress,
      game,
      proveReady: false,
      finalizeReady: false,
      proveReason: `Waiting for output/dispute game to cover L2 block ${parsed.l2BlockNumber.toString()}. Latest covered: ${gameL2Block.toString()}.`,
      finalizeReason: "Not proven yet.",
      finalized,
      proven: false,
    };
  }

  const provenData = await portal.provenWithdrawals(parsed.withdrawalHash, account);
  const proven = provenData.disputeGameProxy && provenData.disputeGameProxy !== ZERO_ADDRESS;

  let finalizeReady = false;
  let finalizeReason = "Not proven yet.";
  if (proven) {
    try {
      await portal.checkWithdrawal.staticCall(parsed.withdrawalHash, account);
      finalizeReady = true;
      finalizeReason = "Ready to finalize.";
    } catch (error) {
      finalizeReason = error.shortMessage || error.message;
    }
  }

  return {
    ...parsed,
    respectedGameType,
    disputeFactoryAddress,
    game,
    gameL2Block,
    proveReady: !proven && !finalized,
    finalizeReady: !finalized && finalizeReady,
    proveReason: proven ? "Already proven by this wallet." : "Ready to prove.",
    finalizeReason,
    finalized,
    proven,
  };
};

const buildProveParams = async (lifecycle) => {
  const output = await rpcJson(BRIDGE_CONFIG.l2RpcUrl, "optimism_outputAtBlock", [toBlockTag(lifecycle.gameL2Block)]);
  const l2Block = await rpcJson(BRIDGE_CONFIG.l2RpcUrl, "eth_getBlockByNumber", [toBlockTag(lifecycle.gameL2Block), false]);

  const slot = ethers.keccak256(ethers.concat([lifecycle.withdrawalHash, ethers.zeroPadValue("0x00", 32)]));
  const proof = await rpcJson(BRIDGE_CONFIG.l2RpcUrl, "eth_getProof", [
    BRIDGE_CONFIG.l2ToL1MessagePasser,
    [slot],
    toBlockTag(lifecycle.gameL2Block),
  ]);

  if (!proof.storageProof?.length) {
    throw new Error("No storage proof returned for withdrawal slot.");
  }

  return {
    withdrawalTx: lifecycle.wdTx,
    disputeGameIndex: lifecycle.game.index,
    outputRootProof: {
      version: ethers.ZeroHash,
      stateRoot: output.stateRoot || l2Block.stateRoot,
      messagePasserStorageRoot: output.withdrawalStorageRoot || proof.storageHash,
      latestBlockhash: output.blockRef?.hash || l2Block.hash,
    },
    withdrawalProof: proof.storageProof[0].proof,
  };
};

function App() {
  const [account, setAccount] = useState("");
  const [depositAmount, setDepositAmount] = useState("0.0005");
  const [withdrawAmount, setWithdrawAmount] = useState("0.0001");
  const [l1Balance, setL1Balance] = useState("");
  const [l2Balance, setL2Balance] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [lastWithdrawalTx, setLastWithdrawalTx] = useState("");
  const [lifecycle, setLifecycle] = useState(null);
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
    if (!selectedAccount) throw new Error("No wallet account selected.");
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
      const result = await switchNetwork(BRIDGE_CONFIG.l2ChainId);
      if (result.added && result.symbol && result.symbol.toLowerCase() !== BRIDGE_CONFIG.l2NativeSymbol.toLowerCase()) {
        setBridgeStatus(
          "wait",
          "Veltrix L2 added with wallet-required symbol",
          `Wallet required "${result.symbol}" for chain ${BRIDGE_CONFIG.l2ChainId}. This is a chain-id metadata collision, not a bridge failure.`,
        );
      } else {
        setBridgeStatus("ok", "Veltrix L2 ready", "Wallet is now on Veltrix L2 (or already had it configured).");
      }
    } catch (error) {
      setBridgeStatus("error", "Veltrix L2 setup failed", error.message);
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

  const loadWithdrawalLifecycle = async (txHash = lastWithdrawalTx) => {
    if (!txHash) {
      setBridgeStatus("error", "Lifecycle unavailable", "No withdrawal tx hash found yet.");
      return;
    }
    try {
      const address = await getActiveAccount();
      const data = await getLifecycleFromChain({ withdrawalTxHash: txHash, account: address });
      setLifecycle(data);
      setBridgeStatus("ok", "Withdrawal lifecycle updated", `Withdrawal hash ${formatAddress(data.withdrawalHash, 12, 10)} loaded.`);
    } catch (error) {
      setBridgeStatus("error", "Lifecycle load failed", error.message);
    }
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
        params: [{ from, to: BRIDGE_CONFIG.optimismPortal, value: toQuantityHex(valueWei), data }],
      });

      addTransaction({
        type: "L1 deposit",
        hash: txHash,
        href: `${BRIDGE_CONFIG.l1Explorer}${txHash}`,
        detail: `${depositAmount} ${BRIDGE_CONFIG.l2NativeSymbol} sent to OptimismPortal`,
      });
      alertSuccess("Deposit submitted successfully.", txHash, BRIDGE_CONFIG.l1Explorer);
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
        params: [{ from, to: BRIDGE_CONFIG.l2ToL1MessagePasser, value: toQuantityHex(valueWei), data }],
      });

      addTransaction({
        type: "L2 withdrawal",
        hash: txHash,
        href: `${BRIDGE_CONFIG.l2ExplorerUrl}${txHash}`,
        detail: `${withdrawAmount} ${BRIDGE_CONFIG.l2NativeSymbol} withdrawal initiated`,
      });
      setLastWithdrawalTx(txHash);
      alertSuccess("Withdrawal initiated successfully.", txHash, BRIDGE_CONFIG.l2ExplorerUrl);
      setBridgeStatus("ok", "Withdrawal initiated", "Lifecycle loaded. Next step is prove once output/dispute game covers the block.");
      await loadWithdrawalLifecycle(txHash);
    } catch (error) {
      setBridgeStatus("error", "Withdrawal failed", error.message);
    } finally {
      setPendingAction("");
    }
  };

  const proveWithdrawal = async () => {
    if (!lastWithdrawalTx) {
      setBridgeStatus("error", "Prove unavailable", "No withdrawal tx hash available.");
      return;
    }
    try {
      setPendingAction("prove");
      setBridgeStatus("wait", "Preparing proof", "Building withdrawal proof and output root proof from chain data.");
      const address = await getActiveAccount();
      const fresh = await getLifecycleFromChain({ withdrawalTxHash: lastWithdrawalTx, account: address });
      if (!fresh.proveReady) {
        throw new Error(fresh.proveReason || "Withdrawal is not ready to prove.");
      }

      const proveParams = await buildProveParams(fresh);
      await switchNetwork(BRIDGE_CONFIG.l1ChainId);
      const browserProvider = new ethers.BrowserProvider(getWalletProvider());
      const signer = await browserProvider.getSigner();
      const portal = new ethers.Contract(BRIDGE_CONFIG.optimismPortal, portalAbi, signer);
      const tx = await portal.proveWithdrawalTransaction(
        proveParams.withdrawalTx,
        proveParams.disputeGameIndex,
        proveParams.outputRootProof,
        proveParams.withdrawalProof,
      );
      await tx.wait();
      alertSuccess("Withdrawal proved successfully.", tx.hash, BRIDGE_CONFIG.l1Explorer);
      setBridgeStatus("ok", "Withdrawal proven", `Prove tx submitted: ${tx.hash}`);
      await loadWithdrawalLifecycle(lastWithdrawalTx);
    } catch (error) {
      setBridgeStatus("error", "Prove failed", error.shortMessage || error.message);
    } finally {
      setPendingAction("");
    }
  };

  const finalizeWithdrawal = async () => {
    if (!lastWithdrawalTx) {
      setBridgeStatus("error", "Finalize unavailable", "No withdrawal tx hash available.");
      return;
    }
    try {
      setPendingAction("finalize");
      const address = await getActiveAccount();
      const fresh = await getLifecycleFromChain({ withdrawalTxHash: lastWithdrawalTx, account: address });
      if (!fresh.finalizeReady) {
        throw new Error(fresh.finalizeReason || "Withdrawal is not ready to finalize.");
      }

      await switchNetwork(BRIDGE_CONFIG.l1ChainId);
      const browserProvider = new ethers.BrowserProvider(getWalletProvider());
      const signer = await browserProvider.getSigner();
      const portal = new ethers.Contract(BRIDGE_CONFIG.optimismPortal, portalAbi, signer);
      const tx = await portal.finalizeWithdrawalTransaction(fresh.wdTx);
      await tx.wait();
      alertSuccess("Withdrawal finalized successfully.", tx.hash, BRIDGE_CONFIG.l1Explorer);
      setBridgeStatus("ok", "Withdrawal finalized", `Finalize tx submitted: ${tx.hash}`);
      await loadWithdrawalLifecycle(lastWithdrawalTx);
    } catch (error) {
      setBridgeStatus("error", "Finalize failed", error.shortMessage || error.message);
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
              <h1>Bridge {BRIDGE_CONFIG.l2NativeSymbol} between Sepolia and Veltrix L2</h1>
              <p>
                Connect wallet, deposit or withdraw, then prove and finalize directly from chain-derived withdrawal lifecycle
                state.
              </p>
              <p className="chain-warning">
                RPC and approve network add requests only when RPC matches <strong>veltrix-rpc.404piyush.me</strong>.
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
            description={`Send ${BRIDGE_CONFIG.l2NativeSymbol} from Sepolia into the same wallet on Veltrix L2 through OptimismPortal.`}
            amount={depositAmount}
            setAmount={setDepositAmount}
            actionLabel="Deposit from Sepolia"
            pending={pendingAction === "deposit"}
            onSubmit={submitDeposit}
          />
          <BridgeCard
            icon={ArrowUpFromLine}
            title="Withdraw to Sepolia"
            description="Initiate L2 withdrawal, then prove and finalize using the lifecycle panel."
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
            <div className="hero-actions">
              <button className="secondary-button" type="button" onClick={() => loadWithdrawalLifecycle()} disabled={!lastWithdrawalTx}>
                Refresh lifecycle
              </button>
              <button className="secondary-button" type="button" onClick={proveWithdrawal} disabled={pendingAction === "prove"}>
                {pendingAction === "prove" ? "Proving..." : "Prove withdrawal"}
              </button>
              <button className="secondary-button" type="button" onClick={finalizeWithdrawal} disabled={pendingAction === "finalize"}>
                {pendingAction === "finalize" ? "Finalizing..." : "Finalize withdrawal"}
              </button>
            </div>
            <Step
              icon={BadgeCheck}
              title="1. Initiated"
              text={lastWithdrawalTx ? `L2 tx: ${formatAddress(lastWithdrawalTx, 12, 10)}` : "Start an L2 withdrawal first."}
              active={Boolean(lastWithdrawalTx)}
            />
            <Step
              icon={Gauge}
              title="2. Prove status"
              text={lifecycle ? lifecycle.proveReason : "Run refresh to resolve prove readiness from chain."}
              active={Boolean(lifecycle?.proveReady || lifecycle?.proven)}
            />
            <Step
              icon={Clock3}
              title="3. Finalize status"
              text={lifecycle ? lifecycle.finalizeReason : "Run refresh to resolve finalization readiness from chain."}
              active={Boolean(lifecycle?.finalizeReady || lifecycle?.finalized)}
            />
            <Step
              icon={ShieldCheck}
              title="4. Finalized"
              text={lifecycle?.finalized ? "Withdrawal is finalized on Sepolia." : "Not finalized yet."}
              active={Boolean(lifecycle?.finalized)}
            />
          </Panel>
        </section>

        <section className="section card">
          <h2>Contracts & RPC</h2>
          <div className="contract-strip">
            <ContractLine label="OptimismPortalProxy" value={BRIDGE_CONFIG.optimismPortal} />
            <ContractLine label="L2ToL1MessagePasser" value={BRIDGE_CONFIG.l2ToL1MessagePasser} />
            <ContractLine label="L2 RPC" value={BRIDGE_CONFIG.l2RpcUrl} />
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
      <strong>{value ? `${value} ${BRIDGE_CONFIG.l2NativeSymbol}` : "--"}</strong>
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
          <span>{BRIDGE_CONFIG.l2NativeSymbol}</span>
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
