import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  getAddress,
  http,
  type Abi,
  type Address,
  type WalletClient,
} from "viem";

import {
  vendingMachineAbi,
  vendingMachineAddress,
  vendingMachineChainId,
} from "../generated/vendingMachine";

const rpcUrl = import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545";
const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID ?? vendingMachineChainId);

export const localChain = defineChain({
  id: configuredChainId,
  name: configuredChainId === 11155111 ? "Ethereum Sepolia" : "Local Hardhat",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers:
    configuredChainId === 11155111
      ? { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } }
      : undefined,
});

const publicClient = createPublicClient({
  chain: localChain,
  transport: http(rpcUrl),
});

type ContractAddress = Address;

export type Product = {
  id: bigint;
  name: string;
  priceWei: bigint;
  stock: bigint;
  active: boolean;
};

export type OwnedProduct = {
  productId: bigint;
  name: string;
  quantity: bigint;
};

export type ConnectedWallet = {
  address: Address;
  client: WalletClient;
};

function getContractAddress(): ContractAddress {
  if (!vendingMachineAddress) {
    throw new Error("Contract address is missing. Run the deploy script for Exercise 1 first.");
  }

  return vendingMachineAddress;
}

function getContractAbi(): Abi {
  return vendingMachineAbi as Abi;
}

function getEthereumProvider() {
  if (!("ethereum" in window) || !window.ethereum) {
    throw new Error("No injected wallet found. Open the app in a browser with MetaMask.");
  }

  return window.ethereum;
}

async function ensureWalletChain() {
  const provider = getEthereumProvider();
  const chainIdHex = `0x${configuredChainId.toString(16)}`;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch {
    // If the wallet cannot switch automatically, MetaMask will show a clear error while signing.
  }
}

async function createConnectedWalletClient() {
  const provider = getEthereumProvider();
  await ensureWalletChain();
  const baseClient = createWalletClient({ chain: localChain, transport: custom(provider) });
  const [address] = await baseClient.requestAddresses();

  return {
    address: getAddress(address),
    client: createWalletClient({
      account: getAddress(address),
      chain: localChain,
      transport: custom(provider),
    }),
  } satisfies ConnectedWallet;
}

export async function getWalletStatus() {
  if (!("ethereum" in window) || !window.ethereum) {
    return null;
  }

  const provider = window.ethereum;
  const baseClient = createWalletClient({ chain: localChain, transport: custom(provider) });
  const addresses = await baseClient.getAddresses();
  const [firstAddress] = addresses;

  if (!firstAddress) {
    return null;
  }

  return {
    address: getAddress(firstAddress),
    client: createWalletClient({
      account: getAddress(firstAddress),
      chain: localChain,
      transport: custom(provider),
    }),
  } satisfies ConnectedWallet;
}

export async function connectWallet() {
  return createConnectedWalletClient();
}

export async function readProducts() {
  const products = await publicClient.readContract({
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "getProducts",
  });

  return products as Product[];
}

export async function readOwnedProducts(owner: Address) {
  const products = await publicClient.readContract({
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "getOwnedProducts",
    args: [owner],
  });

  return products as OwnedProduct[];
}

export async function readAdmin() {
  const admin = await publicClient.readContract({
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "admin",
  });

  return getAddress(admin as Address);
}

export async function purchaseProduct(
  walletClient: WalletClient,
  productId: bigint,
  quantity: bigint,
  value: bigint,
) {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is unavailable.");
  }

  const request = await publicClient.simulateContract({
    account,
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "purchase",
    args: [productId, quantity],
    value,
  });

  const hash = await walletClient.writeContract(request.request);
  await publicClient.waitForTransactionReceipt({ hash });
}

export async function restockProduct(walletClient: WalletClient, productId: bigint, addedStock: bigint) {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is unavailable.");
  }

  const request = await publicClient.simulateContract({
    account,
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "restockProduct",
    args: [productId, addedStock],
  });

  const hash = await walletClient.writeContract(request.request);
  await publicClient.waitForTransactionReceipt({ hash });
}

export async function setProductPrice(walletClient: WalletClient, productId: bigint, newPriceWei: bigint) {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is unavailable.");
  }

  const request = await publicClient.simulateContract({
    account,
    address: getContractAddress(),
    abi: getContractAbi(),
    functionName: "updateProductPrice",
    args: [productId, newPriceWei],
  });

  const hash = await walletClient.writeContract(request.request);
  await publicClient.waitForTransactionReceipt({ hash });
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
      on?: (eventName: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (eventName: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}
