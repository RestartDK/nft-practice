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
  loyaltyPointsAbi,
  loyaltyPointsAddress,
  loyaltyPointsChainId,
} from "../generated/loyaltyPoints";

const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID ?? loyaltyPointsChainId);
const rpcUrl = import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545";

export const appChain = defineChain({
  id: configuredChainId,
  name: configuredChainId === 11155111 ? "Ethereum Sepolia" : "Local Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  blockExplorers:
    configuredChainId === 11155111
      ? { default: { name: "Etherscan", url: "https://sepolia.etherscan.io" } }
      : undefined,
});

export const publicClient = createPublicClient({
  chain: appChain,
  transport: http(rpcUrl),
});

export type ConnectedWallet = {
  address: Address;
  client: WalletClient;
};

function contractAddress() {
  if (!loyaltyPointsAddress || loyaltyPointsAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("LoyaltyPoints contract address is missing. Run the deploy script first.");
  }

  return loyaltyPointsAddress;
}

function contractAbi() {
  return loyaltyPointsAbi as Abi;
}

function ethereumProvider() {
  if (!("ethereum" in window) || !window.ethereum) {
    throw new Error("No injected wallet found. Open the app in a browser with MetaMask.");
  }

  return window.ethereum;
}

async function ensureWalletChain() {
  const provider = ethereumProvider();
  const chainIdHex = `0x${configuredChainId.toString(16)}`;

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch {
    // If the wallet cannot switch automatically, the transaction will still fail with a clear wallet error.
  }
}

function walletClientFor(address: Address) {
  return createWalletClient({
    account: address,
    chain: appChain,
    transport: custom(ethereumProvider()),
  });
}

export async function connectWallet() {
  await ensureWalletChain();
  const baseClient = createWalletClient({ chain: appChain, transport: custom(ethereumProvider()) });
  const [address] = await baseClient.requestAddresses();

  return {
    address: getAddress(address),
    client: walletClientFor(getAddress(address)),
  } satisfies ConnectedWallet;
}

export async function getWalletStatus() {
  if (!("ethereum" in window) || !window.ethereum) {
    return null;
  }

  const baseClient = createWalletClient({ chain: appChain, transport: custom(window.ethereum) });
  const [address] = await baseClient.getAddresses();

  if (!address) {
    return null;
  }

  return {
    address: getAddress(address),
    client: walletClientFor(getAddress(address)),
  } satisfies ConnectedWallet;
}

export async function readTokenInfo() {
  const [name, symbol, decimals, totalSupply, owner] = await Promise.all([
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "name" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "symbol" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "decimals" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "totalSupply" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "owner" }),
  ]);

  return {
    name: name as string,
    symbol: symbol as string,
    decimals: decimals as number,
    totalSupply: totalSupply as bigint,
    owner: getAddress(owner as Address),
  };
}

export async function readBalance(address: Address) {
  const balance = await publicClient.readContract({
    address: contractAddress(),
    abi: contractAbi(),
    functionName: "balanceOf",
    args: [address],
  });

  return balance as bigint;
}

async function writeContract(
  walletClient: WalletClient,
  functionName: string,
  args: readonly unknown[],
) {
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account is unavailable.");
  }

  const request = await publicClient.simulateContract({
    account,
    address: contractAddress(),
    abi: contractAbi(),
    functionName,
    args,
  } as never);

  const hash = await walletClient.writeContract({ ...request.request, account } as never);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export function mintPoints(walletClient: WalletClient, to: Address, amount: bigint) {
  return writeContract(walletClient, "mint", [getAddress(to), amount]);
}

export function transferPoints(walletClient: WalletClient, to: Address, amount: bigint) {
  return writeContract(walletClient, "transfer", [getAddress(to), amount]);
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
