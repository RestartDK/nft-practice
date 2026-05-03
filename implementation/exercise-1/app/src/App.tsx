import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { formatEther, parseEther } from "viem";

import {
  connectWallet,
  getWalletStatus,
  readAdmin,
  readOwnedProducts,
  readProducts,
  restockProduct,
  setProductPrice,
  purchaseProduct,
  type ConnectedWallet,
  type OwnedProduct,
  type Product,
} from "./lib/web3";

type LoadState = "idle" | "loading" | "ready" | "error";

function formatEth(value: bigint) {
  return `${Number(formatEther(value)).toFixed(4)} ETH`;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [ownedProducts, setOwnedProducts] = useState<OwnedProduct[]>([]);
  const [wallet, setWallet] = useState<ConnectedWallet | null>(null);
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Deploy the contract, then connect a wallet.");
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [refreshKey, setRefreshKey] = useState(0);
  const [restockValues, setRestockValues] = useState<Record<string, string>>({});
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoadState("loading");

      try {
        const [productList, admin, nextWallet] = await Promise.all([
          readProducts(),
          readAdmin(),
          getWalletStatus(),
        ]);

        if (cancelled) {
          return;
        }

        setProducts(productList);
        setAdminAddress(admin);
        setWallet(nextWallet);

        if (nextWallet) {
          const owned = await readOwnedProducts(nextWallet.address);
          if (!cancelled) {
            setOwnedProducts(owned);
          }
        } else {
          setOwnedProducts([]);
        }

        setLoadState("ready");
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setMessage(error instanceof Error ? error.message : "Failed to load contract state.");
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const isAdmin = useMemo(() => {
    if (!wallet || !adminAddress) {
      return false;
    }

    return wallet.address.toLowerCase() === adminAddress.toLowerCase();
  }, [adminAddress, wallet]);

  async function handleConnectWallet() {
    try {
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
      setMessage(`Connected ${nextWallet.address}`);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to connect wallet.");
    }
  }

  async function handlePurchase(productId: bigint, quantity: number, priceWei: bigint) {
    if (!wallet) {
      setMessage("Connect a wallet before purchasing.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setMessage("Choose a positive purchase quantity.");
      return;
    }

    try {
      setMessage("Submitting purchase transaction...");
      await purchaseProduct(wallet.client, productId, BigInt(quantity), priceWei * BigInt(quantity));
      setMessage("Purchase confirmed.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Purchase failed.");
    }
  }

  async function handleRestock(productId: bigint) {
    if (!wallet) {
      return;
    }

    const rawValue = restockValues[productId.toString()] ?? "";
    const amount = Number(rawValue);
    if (!Number.isInteger(amount) || amount <= 0) {
      setMessage("Enter a positive stock amount.");
      return;
    }

    try {
      setMessage("Restocking product...");
      await restockProduct(wallet.client, productId, BigInt(amount));
      setRestockValues((current) => ({ ...current, [productId.toString()]: "" }));
      setMessage("Restock confirmed.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Restock failed.");
    }
  }

  async function handlePriceUpdate(productId: bigint) {
    if (!wallet) {
      return;
    }

    const rawValue = priceValues[productId.toString()] ?? "";
    if (!rawValue) {
      setMessage("Enter a new price in ETH.");
      return;
    }

    try {
      setMessage("Updating price...");
      await setProductPrice(wallet.client, productId, parseEther(rawValue));
      setPriceValues((current) => ({ ...current, [productId.toString()]: "" }));
      setMessage("Price updated.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Price update failed.");
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Exercise 1</p>
          <h1>Vending Machine dApp</h1>
          <p className="subtle">On-chain products, stock, ownership, and admin restocking.</p>
        </div>

        <div className="topbar-actions">
          <nav className="nav-tabs" aria-label="Exercise sections">
            <NavLink to="/" end>
              Shop
            </NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>

          <button className="primary-button" onClick={handleConnectWallet} type="button">
            {wallet ? "Reconnect wallet" : "Connect wallet"}
          </button>
        </div>
      </header>

      <section className="status-grid">
        <article className="info-card">
          <span className="label">Wallet</span>
          <strong>{wallet ? wallet.address : "Not connected"}</strong>
        </article>
        <article className="info-card">
          <span className="label">Admin</span>
          <strong>{adminAddress ?? "Deploy the contract first"}</strong>
        </article>
        <article className="info-card status-card">
          <span className="label">Status</span>
          <strong>{loadState === "loading" ? "Loading" : message}</strong>
        </article>
      </section>

      <Routes>
        <Route
          path="/"
          element={
            <section className="content-grid">
              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Storefront</p>
                    <h2>Products</h2>
                  </div>
                </div>

                <div className="product-list">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id.toString()}
                      product={product}
                      onPurchase={handlePurchase}
                    />
                  ))}
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Ownership</p>
                    <h2>My Items</h2>
                  </div>
                </div>

                {ownedProducts.length === 0 ? (
                  <p className="empty-state">Connect a wallet and buy a product to see ownership here.</p>
                ) : (
                  <ul className="owned-list">
                    {ownedProducts.map((ownedProduct) => (
                      <li key={ownedProduct.productId.toString()}>
                        <div>
                          <strong>{ownedProduct.name}</strong>
                          <span>Product #{ownedProduct.productId.toString()}</span>
                        </div>
                        <span className="pill">{ownedProduct.quantity.toString()} owned</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          }
        />

        <Route
          path="/admin"
          element={
            <section className="panel admin-panel">
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Admin Controls</p>
                  <h2>Restock and repricing</h2>
                </div>
                {!isAdmin && <span className="pill warning">Connect with the admin wallet to edit products.</span>}
              </div>

              <div className="admin-list">
                {products.map((product) => (
                  <article className="admin-item" key={product.id.toString()}>
                    <div>
                      <h3>{product.name}</h3>
                      <p>
                        Product #{product.id.toString()} · {formatEth(product.priceWei)} · {product.stock.toString()} in stock
                      </p>
                    </div>

                    <div className="inline-form">
                      <label>
                        Add stock
                        <input
                          value={restockValues[product.id.toString()] ?? ""}
                          onChange={(event) =>
                            setRestockValues((current) => ({
                              ...current,
                              [product.id.toString()]: event.target.value,
                            }))
                          }
                          placeholder="5"
                          type="number"
                        />
                      </label>
                      <button disabled={!isAdmin} onClick={() => void handleRestock(product.id)} type="button">
                        Restock
                      </button>
                    </div>

                    <div className="inline-form">
                      <label>
                        New price (ETH)
                        <input
                          value={priceValues[product.id.toString()] ?? ""}
                          onChange={(event) =>
                            setPriceValues((current) => ({
                              ...current,
                              [product.id.toString()]: event.target.value,
                            }))
                          }
                          placeholder="0.002"
                          type="number"
                          step="0.0001"
                        />
                      </label>
                      <button disabled={!isAdmin} onClick={() => void handlePriceUpdate(product.id)} type="button">
                        Update price
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          }
        />
      </Routes>
    </div>
  );
}

function ProductCard({
  product,
  onPurchase,
}: {
  product: Product;
  onPurchase: (productId: bigint, quantity: number, priceWei: bigint) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <article className="product-card">
      <div>
        <p className="eyebrow">Product #{product.id.toString()}</p>
        <h3>{product.name}</h3>
      </div>

      <dl className="metric-list">
        <div>
          <dt>Price</dt>
          <dd>{formatEth(product.priceWei)}</dd>
        </div>
        <div>
          <dt>Stock</dt>
          <dd>{product.stock.toString()}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{product.active ? "Available" : "Paused"}</dd>
        </div>
      </dl>

      <div className="purchase-row">
        <label>
          Quantity
          <input
            max={Number(product.stock)}
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            value={quantity}
          />
        </label>
        <button
          disabled={!product.active || product.stock === 0n}
          onClick={() => void onPurchase(product.id, quantity, product.priceWei)}
          type="button"
        >
          Buy for {formatEth(product.priceWei * BigInt(quantity || 1))}
        </button>
      </div>
    </article>
  );
}

export default App;
