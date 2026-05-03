import "dotenv/config";

import { createPublicClient, createWalletClient, getContract, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { vendingMachineAbi, vendingMachineAddress } from "../app/src/generated/vendingMachine";

function privateKeyFromEnv() {
  const raw = process.env.SEPOLIA_PRIVATE_KEY;
  if (!raw) {
    throw new Error("SEPOLIA_PRIVATE_KEY is missing.");
  }

  const normalized = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("SEPOLIA_PRIVATE_KEY must be a 32-byte hex private key.");
  }

  return normalized as `0x${string}`;
}

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL is missing.");
  }

  const account = privateKeyToAccount(privateKeyFromEnv());
  const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const contract = getContract({
    address: vendingMachineAddress,
    abi: vendingMachineAbi,
    client: { public: publicClient, wallet: walletClient },
  });

  const productId = 0n;
  const quantity = 1n;
  const value = parseEther("0.002");
  const hash = await contract.write.purchase([productId, quantity], { account, value });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log(`Purchased product ${productId.toString()} x ${quantity.toString()}`);
  console.log(`Buyer: ${account.address}`);
  console.log(`Transaction: ${hash}`);
  console.log(`Etherscan: https://sepolia.etherscan.io/tx/${hash}`);
  console.log(`Block: ${receipt.blockNumber.toString()}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
