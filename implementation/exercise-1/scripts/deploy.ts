import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { artifacts, network } from "hardhat";
import { formatEther, parseEther } from "viem";

const seedProducts = {
  names: ["Cold Brew", "Trail Mix", "Sparkling Water"],
  prices: [parseEther("0.002"), parseEther("0.0015"), parseEther("0.001")],
  stocks: [12n, 18n, 24n],
};

async function main() {
  const { viem } = await network.create();

  const vendingMachine = await viem.deployContract("VendingMachine", [
    seedProducts.names,
    seedProducts.prices,
    seedProducts.stocks,
  ]);

  const publicClient = await viem.getPublicClient();
  const chainId = await publicClient.getChainId();
  const artifact = await artifacts.readArtifact("VendingMachine");

  const rootDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const generatedDir = path.join(rootDir, "app", "src", "generated");
  const generatedFile = path.join(generatedDir, "vendingMachine.ts");

  await mkdir(generatedDir, { recursive: true });
  await writeFile(
    generatedFile,
    `import type { Address } from "viem";

export const vendingMachineAddress = ${JSON.stringify(vendingMachine.address)} as Address;
export const vendingMachineChainId = ${chainId};
export const vendingMachineAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;
`,
  );

  console.log(`VendingMachine deployed to ${vendingMachine.address}`);
  console.log(`Primary prices: ${seedProducts.prices.map((price) => formatEther(price)).join(", ")} ETH`);
  console.log(`Generated frontend config at ${generatedFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
