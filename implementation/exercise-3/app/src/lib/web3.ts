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
  eventTicketNFTAbi,
  eventTicketNFTAddress,
  eventTicketNFTChainId,
} from "../generated/eventTicketNFT";

const configuredChainId = Number(import.meta.env.VITE_CHAIN_ID ?? eventTicketNFTChainId);
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

export type TicketView = {
  tokenId: bigint;
  owner: Address;
  eventName: string;
  venue: string;
  startsAt: bigint;
  seat: string;
  tier: string;
};

function contractAddress() {
  if (!eventTicketNFTAddress || eventTicketNFTAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("EventTicketNFT contract address is missing. Run the deploy script first.");
  }

  return eventTicketNFTAddress;
}

function contractAbi() {
  return eventTicketNFTAbi as Abi;
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
    // If automatic switching fails, MetaMask will show a clear network error during signing.
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

export async function readContractInfo() {
  const [name, symbol, owner, totalSupply] = await Promise.all([
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "name" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "symbol" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "owner" }),
    publicClient.readContract({ address: contractAddress(), abi: contractAbi(), functionName: "totalSupply" }),
  ]);

  return {
    name: name as string,
    symbol: symbol as string,
    owner: getAddress(owner as Address),
    totalSupply: totalSupply as bigint,
  };
}

export async function readOwnedTickets(owner: Address) {
  const tickets = await publicClient.readContract({
    address: contractAddress(),
    abi: contractAbi(),
    functionName: "getTicketsOfOwner",
    args: [owner],
  });

  return tickets as TicketView[];
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

export function mintTicket(
  walletClient: WalletClient,
  input: {
    to: Address;
    eventName: string;
    venue: string;
    startsAt: bigint;
    seat: string;
    tier: string;
  },
) {
  return writeContract(walletClient, "mintTicket", [
    getAddress(input.to),
    input.eventName,
    input.venue,
    input.startsAt,
    input.seat,
    input.tier,
  ]);
}

export function approveTicket(walletClient: WalletClient, to: Address, tokenId: bigint) {
  return writeContract(walletClient, "approve", [getAddress(to), tokenId]);
}

export function transferTicket(walletClient: WalletClient, from: Address, to: Address, tokenId: bigint) {
  return writeContract(walletClient, "transferFrom", [getAddress(from), getAddress(to), tokenId]);
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
