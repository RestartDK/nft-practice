import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";

import {
  appChain,
  approveTicket,
  connectWallet,
  getWalletStatus,
  mintTicket,
  readContractInfo,
  readOwnedTickets,
  transferTicket,
  type ConnectedWallet,
  type TicketView,
} from "./lib/web3";

type ContractInfo = {
  name: string;
  symbol: string;
  owner: string;
  totalSupply: bigint;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

function defaultStartTime() {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  nextWeek.setSeconds(0, 0);
  return nextWeek.toISOString().slice(0, 16);
}

function App() {
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [ownedTickets, setOwnedTickets] = useState<TicketView[]>([]);
  const [message, setMessage] = useState("Deploy the ERC-721 contract, then connect MetaMask.");
  const [refreshKey, setRefreshKey] = useState(0);
  const [mintForm, setMintForm] = useState({
    to: "",
    eventName: "Campus Blockchain Summit",
    venue: "Aula Magna",
    startsAt: defaultStartTime(),
    seat: "A-12",
    tier: "VIP",
  });
  const [transferForms, setTransferForms] = useState<
    Record<string, { approvedTo: string; transferFromAddr: string; transferTo: string }>
  >({});
  const [delegatedTransfer, setDelegatedTransfer] = useState({ tokenId: "", from: "", to: "" });

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [info, currentWallet] = await Promise.all([readContractInfo(), getWalletStatus()]);
        if (cancelled) return;

        setContractInfo(info);
        setWallet(currentWallet);

        if (currentWallet) {
          setOwnedTickets(await readOwnedTickets(currentWallet.address));
        } else {
          setOwnedTickets([]);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Failed to load NFT contract state.");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const isOwner = useMemo(() => {
    if (!wallet || !contractInfo) return false;
    return wallet.address.toLowerCase() === contractInfo.owner.toLowerCase();
  }, [contractInfo, wallet]);

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

  async function handleMint() {
    if (!wallet) {
      setMessage("Connect the owner wallet before minting.");
      return;
    }

    try {
      const startsAt = BigInt(Math.floor(new Date(mintForm.startsAt).getTime() / 1000));
      if (startsAt <= BigInt(Math.floor(Date.now() / 1000))) {
        throw new Error("Ticket start time must be in the future.");
      }

      setMessage("Submitting owner-only ERC-721 mint transaction...");
      const hash = await mintTicket(wallet.client, {
        to: getAddress(mintForm.to),
        eventName: mintForm.eventName,
        venue: mintForm.venue,
        startsAt,
        seat: mintForm.seat,
        tier: mintForm.tier,
      });
      await refresh(`Ticket minted: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mint failed.");
    }
  }

  function formFor(tokenId: bigint) {
    return transferForms[tokenId.toString()] ?? {
      approvedTo: "",
      transferFromAddr: "",
      transferTo: "",
    };
  }

  function setTokenForm(tokenId: bigint, key: "approvedTo" | "transferFromAddr" | "transferTo", value: string) {
    setTransferForms((current) => ({
      ...current,
      [tokenId.toString()]: {
        ...formFor(tokenId),
        [key]: value,
      },
    }));
  }

  async function handleApprove(tokenId: bigint) {
    if (!wallet) {
      setMessage("Connect a wallet before approving.");
      return;
    }

    try {
      const to = getAddress(formFor(tokenId).approvedTo);
      setMessage(`Approving ${to} for ticket #${tokenId.toString()}...`);
      const hash = await approveTicket(wallet.client, to, tokenId);
      await refresh(`Approval confirmed: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Approval failed.");
    }
  }

  async function handleTransfer(tokenId: bigint) {
    if (!wallet) {
      setMessage("Connect a wallet before transferring.");
      return;
    }

    try {
      const rawFrom = formFor(tokenId).transferFromAddr.trim();
      const from = getAddress(rawFrom.length > 0 ? rawFrom : wallet.address);
      const to = getAddress(formFor(tokenId).transferTo);
      setMessage(`Transferring ticket #${tokenId.toString()} (${from} → ${to})...`);
      const hash = await transferTicket(wallet.client, from, to, tokenId);
      await refresh(`Transfer confirmed: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    }
  }

  async function handleDelegatedTransfer() {
    if (!wallet) {
      setMessage("Connect the approved wallet before a delegated transfer.");
      return;
    }

    try {
      const tokenId = BigInt(delegatedTransfer.tokenId.trim());
      const from = getAddress(delegatedTransfer.from.trim());
      const to = getAddress(delegatedTransfer.to.trim());
      setMessage(`Delegated transferFrom #${delegatedTransfer.tokenId} (${from} → ${to})...`);
      const hash = await transferTicket(wallet.client, from, to, tokenId);
      setDelegatedTransfer({ tokenId: "", from: "", to: "" });
      await refresh(`Delegated transfer confirmed: ${hash}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delegated transfer failed.");
    }
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Exercise 3</p>
          <h1>ERC-721 NFT Event Tickets</h1>
          <p className="subtle">Each event ticket is a unique NFT with metadata, approval, and transfer support.</p>
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
          <span>Collection</span>
          <strong>{contractInfo ? `${contractInfo.name} (${contractInfo.symbol})` : "Not loaded"}</strong>
        </article>
        <article className="info-card">
          <span>Status</span>
          <strong>{message}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Admin View</p>
              <h2>Mint NFT ticket</h2>
            </div>
            {!isOwner && <span className="pill warning">Owner wallet required</span>}
          </div>
          <p className="subtle">Owner: {contractInfo?.owner ?? "Unknown"}</p>
          <p className="subtle">Total minted/supply: {contractInfo?.totalSupply.toString() ?? "0"}</p>

          <label>
            Recipient wallet
            <input
              onChange={(event) => setMintForm((current) => ({ ...current, to: event.target.value }))}
              placeholder="0x..."
              value={mintForm.to}
            />
          </label>
          <label>
            Event name
            <input
              onChange={(event) => setMintForm((current) => ({ ...current, eventName: event.target.value }))}
              value={mintForm.eventName}
            />
          </label>
          <label>
            Venue
            <input
              onChange={(event) => setMintForm((current) => ({ ...current, venue: event.target.value }))}
              value={mintForm.venue}
            />
          </label>
          <div className="two-column-form">
            <label>
              Starts at
              <input
                onChange={(event) => setMintForm((current) => ({ ...current, startsAt: event.target.value }))}
                type="datetime-local"
                value={mintForm.startsAt}
              />
            </label>
            <label>
              Seat
              <input
                onChange={(event) => setMintForm((current) => ({ ...current, seat: event.target.value }))}
                value={mintForm.seat}
              />
            </label>
          </div>
          <label>
            Tier
            <input
              onChange={(event) => setMintForm((current) => ({ ...current, tier: event.target.value }))}
              value={mintForm.tier}
            />
          </label>
          <button disabled={!wallet || !isOwner} onClick={() => void handleMint()} type="button">
            Mint NFT ticket
          </button>
        </article>

        <article className="panel tickets-panel">
          <p className="eyebrow">User View</p>
          <h2>My NFT tickets</h2>
          {ownedTickets.length === 0 ? (
            <p className="empty-state">Connect a wallet with tickets, or mint one to this wallet.</p>
          ) : (
            <div className="ticket-list">
              {ownedTickets.map((ticket) => {
                const tokenForm = formFor(ticket.tokenId);
                return (
                  <article className="ticket-card" key={ticket.tokenId.toString()}>
                    <div>
                      <p className="eyebrow">Token #{ticket.tokenId.toString()}</p>
                      <h3>{ticket.eventName}</h3>
                      <p className="subtle">{ticket.venue} · {formatDate(ticket.startsAt)}</p>
                    </div>
                    <dl>
                      <div>
                        <dt>Seat</dt>
                        <dd>{ticket.seat}</dd>
                      </div>
                      <div>
                        <dt>Tier</dt>
                        <dd>{ticket.tier}</dd>
                      </div>
                    </dl>

                    <label>
                      Approve address
                      <input
                        onChange={(event) => setTokenForm(ticket.tokenId, "approvedTo", event.target.value)}
                        placeholder="0x..."
                        value={tokenForm.approvedTo}
                      />
                    </label>
                    <button disabled={!wallet} onClick={() => void handleApprove(ticket.tokenId)} type="button">
                      Approve
                    </button>

                    <label>
                      Transfer from (optional)
                      <input
                        onChange={(event) => setTokenForm(ticket.tokenId, "transferFromAddr", event.target.value)}
                        placeholder="Defaults to connected wallet"
                        value={tokenForm.transferFromAddr}
                      />
                    </label>
                    <p className="subtle">
                      Leave blank to transfer your own ticket. Set to another owner’s address when your connected
                      wallet is the approved spender (also use the form below if the ticket is not listed here).
                    </p>
                    <label>
                      Transfer to
                      <input
                        onChange={(event) => setTokenForm(ticket.tokenId, "transferTo", event.target.value)}
                        placeholder="0x..."
                        value={tokenForm.transferTo}
                      />
                    </label>
                    <button disabled={!wallet} onClick={() => void handleTransfer(ticket.tokenId)} type="button">
                      Transfer NFT
                    </button>
                  </article>
                );
              })}
            </div>
          )}

          <article className="ticket-card delegated-transfer-card">
            <p className="eyebrow">Approved spender</p>
            <h3>transferFrom without owning the NFT</h3>
            <p className="subtle">
              After the owner approves your address for this token, connect as that spender and submit. On-chain call:{" "}
              <code className="inline-code">transferFrom(from, to, tokenId)</code> with your wallet as{" "}
              <code className="inline-code">msg.sender</code>.
            </p>
            <label>
              Token ID
              <input
                inputMode="numeric"
                onChange={(event) => setDelegatedTransfer((s) => ({ ...s, tokenId: event.target.value }))}
                placeholder="1"
                value={delegatedTransfer.tokenId}
              />
            </label>
            <label>
              From (current owner)
              <input
                onChange={(event) => setDelegatedTransfer((s) => ({ ...s, from: event.target.value }))}
                placeholder="0x..."
                value={delegatedTransfer.from}
              />
            </label>
            <label>
              To (recipient)
              <input
                onChange={(event) => setDelegatedTransfer((s) => ({ ...s, to: event.target.value }))}
                placeholder="0x..."
                value={delegatedTransfer.to}
              />
            </label>
            <button disabled={!wallet} onClick={() => void handleDelegatedTransfer()} type="button">
              Run delegated transferFrom
            </button>
          </article>
        </article>
      </section>
    </main>
  );
}

export default App;
