import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { artifacts, network } from "hardhat";
import { formatEther, parseEther } from "viem";

async function main() {
  const { viem } = await network.create();
  const [owner, firstCustomer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const loyaltyPoints = await viem.deployContract("LoyaltyPoints", []);
  const seedAmount = parseEther("100");

  if (firstCustomer?.account) {
    const mintHash = await loyaltyPoints.write.mint([firstCustomer.account.address, seedAmount], {
      account: owner.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: mintHash });
  }

  const artifact = await artifacts.readArtifact("LoyaltyPoints");
  const chainId = await publicClient.getChainId();

  const rootDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const generatedDir = path.join(rootDir, "app", "src", "generated");
  const generatedFile = path.join(generatedDir, "loyaltyPoints.ts");

  await mkdir(generatedDir, { recursive: true });
  await writeFile(
    generatedFile,
    `import type { Address } from "viem";\n\nexport const loyaltyPointsAddress = ${JSON.stringify(loyaltyPoints.address)} as Address;\nexport const loyaltyPointsChainId = ${chainId};\nexport const loyaltyPointsAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`,
  );

  console.log(`LoyaltyPoints deployed to ${loyaltyPoints.address}`);
  if (firstCustomer?.account) {
    console.log(`Seeded ${formatEther(seedAmount)} CLP to ${firstCustomer.account.address}`);
  }
  console.log(`Generated frontend config at ${generatedFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
