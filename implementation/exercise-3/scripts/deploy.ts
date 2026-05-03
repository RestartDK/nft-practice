import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { artifacts, network } from "hardhat";

const now = Math.floor(Date.now() / 1000);

async function main() {
  const { viem } = await network.create();
  const [owner, attendee] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const eventTicketNFT = await viem.deployContract("EventTicketNFT", []);
  const seedRecipient = attendee?.account?.address ?? owner.account.address;

  const seedTickets = [
    {
      to: seedRecipient,
      eventName: "Campus Blockchain Summit",
      venue: "Aula Magna",
      startsAt: BigInt(now + 7 * 24 * 60 * 60),
      seat: "A-12",
      tier: "VIP",
    },
    {
      to: owner.account.address,
      eventName: "Ethereum Security Workshop",
      venue: "Innovation Lab",
      startsAt: BigInt(now + 14 * 24 * 60 * 60),
      seat: "B-07",
      tier: "General",
    },
  ];

  for (const ticket of seedTickets) {
    const hash = await eventTicketNFT.write.mintTicket(
      [ticket.to, ticket.eventName, ticket.venue, ticket.startsAt, ticket.seat, ticket.tier],
      { account: owner.account },
    );
    await publicClient.waitForTransactionReceipt({ hash });
  }

  const artifact = await artifacts.readArtifact("EventTicketNFT");
  const chainId = await publicClient.getChainId();

  const rootDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
  const generatedDir = path.join(rootDir, "app", "src", "generated");
  const generatedFile = path.join(generatedDir, "eventTicketNFT.ts");

  await mkdir(generatedDir, { recursive: true });
  await writeFile(
    generatedFile,
    `import type { Address } from "viem";\n\nexport const eventTicketNFTAddress = ${JSON.stringify(eventTicketNFT.address)} as Address;\nexport const eventTicketNFTChainId = ${chainId};\nexport const eventTicketNFTAbi = ${JSON.stringify(artifact.abi, null, 2)} as const;\n`,
  );

  console.log(`EventTicketNFT deployed to ${eventTicketNFT.address}`);
  console.log(`Seeded ${seedTickets.length} ticket NFTs`);
  console.log(`Generated frontend config at ${generatedFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
