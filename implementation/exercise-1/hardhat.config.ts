import "dotenv/config";

import { defineConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";

const rawSepoliaPrivateKey = process.env.SEPOLIA_PRIVATE_KEY;
const normalizedSepoliaPrivateKey = rawSepoliaPrivateKey?.startsWith("0x")
  ? rawSepoliaPrivateKey
  : rawSepoliaPrivateKey
    ? `0x${rawSepoliaPrivateKey}`
    : undefined;
const sepoliaPrivateKey = normalizedSepoliaPrivateKey && /^0x[0-9a-fA-F]{64}$/.test(normalizedSepoliaPrivateKey)
  ? normalizedSepoliaPrivateKey
  : undefined;

const config = defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    localhost: {
      type: "http",
      url: process.env.RPC_URL ?? "http://127.0.0.1:8545",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: process.env.SEPOLIA_RPC_URL ?? "",
      accounts: sepoliaPrivateKey ? [sepoliaPrivateKey] : [],
    },
  },
});

export default config;
