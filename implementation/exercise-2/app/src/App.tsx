import { useEffect, useMemo, useState } from "react";
import { formatUnits, getAddress, parseUnits } from "viem";

import {
  appChain,
  connectWallet,
  getWalletStatus,
  mintPoints,
  readBalance,
  readTokenInfo,
  transferPoints,
  type ConnectedWallet,
} from "./lib/web3";

type TokenInfo = {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  owner: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function App() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [message, setMessage] = useState("Deploy the token contract, then connect MetaMask.");
  const [refreshKey, setRefreshKey] = useState(0);
  const [transferForm, setTransferForm] = useState({ to: "", amount: "" });
  const [mintForm, setMintForm] = useState({ to: "", amount: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [info, currentWallet] = await Promise.all([readTokenInfo(), getWalletStatus()]);
        if (cancelled) return;

        setTokenInfo(info);
        setWallet(currentWallet);

        if (currentWallet) {
          setBalance(await readBalance(currentWallet.address));
        } else {
          setBalance(0n);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load token state.");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const isOwner = useMemo(() => {
    if (!wallet || !tokenInfo) return false;
    return wallet.address.toLowerCase() === tokenInfo.owner.toLowerCase();
  }, [tokenInfo, wallet]);

  const decimals = tokenInfo?.decimals ?? 18;
  const symbol = tokenInfo?.symbol ?? "CLP";

  async function refresh(nextMessage: string) {
    setMessage(nextMessage);
    setRefreshKey((value) => value + 1);
  }

  async function handleConnect() {
    try {
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
      await refresh(`Connected ${nextWallet.address}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect wallet.");
    }
  }

  async function handleTransfer() {
    if (!wallet) {
      setMessage("Connect a wallet before transferring tokens.");
      return;
    }

    try {
      const to = getAddress(transferForm.to);
      const amount = parseUnits(transferForm.amount, decimals);
      if (amount <= 0n) throw new Error("Enter a positive transfer amount.");

      setMessage("Submitting ERC-20 transfer transaction...");
      const hash = await transferPoints(wallet.client, to, amount);
      setTransferForm({ to: "", amount: "" });
      await refresh(`Transfer confirmed: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    }
  }

  async function handleMint() {
    if (!wallet) {
      setMessage("Connect the owner wallet before minting.");
      return;
    }

    try {
      const to = getAddress(mintForm.to);
      const amount = parseUnits(mintForm.amount, decimals);
      if (amount <= 0n) throw new Error("Enter a positive mint amount.");

      setMessage("Submitting owner-only mint transaction...");
      const hash = await mintPoints(wallet.client, to, amount);
      setMintForm({ to: "", amount: "" });
      await refresh(`Mint confirmed: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mint failed.");
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Exercise 2</p>
          <h1>ERC-20 Loyalty Points</h1>
          <p className="subtle">Admin mints campus loyalty points; customers view balances and transfer tokens.</p>
        </div>
        <button className="primary-button" onClick={handleConnect} type="button">
          {wallet ? "Reconnect wallet" : "Connect wallet"}
        </button>
      </header>

      <section className="status-grid">
        <article className="info-card">
          <span>Network</span>
          <strong>{appChain.name} ({appChain.id})</strong>
        </article>
        <article className="info-card">
          <span>Wallet</span>
          <strong>{wallet ? shortAddress(wallet.address) : "Not connected"}</strong>
        </article>
        <article className="info-card">
          <span>Token</span>
          <strong>{tokenInfo ? `${tokenInfo.name} (${symbol})` : "Not loaded"}</strong>
        </article>
        <article className="info-card">
          <span>Status</span>
          <strong>{message}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <p className="eyebrow">Customer View</p>
          <h2>Balance and transfer</h2>
          <div className="balance-display">
            <span>Your balance</span>
            <strong>{formatUnits(balance, decimals)} {symbol}</strong>
          </div>

          <label>
            Recipient wallet
            <input
              onChange={(event) => setTransferForm((current) => ({ ...current, to: event.target.value }))}
              placeholder="0x..."
              value={transferForm.to}
            />
          </label>
          <label>
            Amount
            <input
              min="0"
              onChange={(event) => setTransferForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="10"
              step="0.01"
              type="number"
              value={transferForm.amount}
            />
          </label>
          <button disabled={!wallet} onClick={() => void handleTransfer()} type="button">
            Transfer {symbol}
          </button>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Admin View</p>
              <h2>Mint rewards</h2>
            </div>
            {!isOwner && <span className="pill warning">Owner wallet required</span>}
          </div>
          <p className="subtle">Owner: {tokenInfo?.owner ?? "Unknown"}</p>
          <p className="subtle">Total supply: {tokenInfo ? `${formatUnits(tokenInfo.totalSupply, decimals)} ${symbol}` : "Unknown"}</p>

          <label>
            Customer wallet
            <input
              onChange={(event) => setMintForm((current) => ({ ...current, to: event.target.value }))}
              placeholder="0x..."
              value={mintForm.to}
            />
          </label>
          <label>
            Reward amount
            <input
              min="0"
              onChange={(event) => setMintForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="100"
              step="0.01"
              type="number"
              value={mintForm.amount}
            />
          </label>
          <button disabled={!wallet || !isOwner} onClick={() => void handleMint()} type="button">
            Mint {symbol}
          </button>
        </article>
      </section>
    </main>
  );
}

export default App;
