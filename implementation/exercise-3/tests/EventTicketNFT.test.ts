import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

const startsAt = BigInt(Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60);
const sampleTicket = {
  eventName: "Blockchain Summit",
  venue: "Aula Magna",
  startsAt,
  seat: "A-12",
  tier: "VIP",
};

describe("EventTicketNFT", async () => {
  const { viem } = await network.create();

  async function deployFixture() {
    const publicClient = await viem.getPublicClient();
    const [owner, attendee, recipient, outsider] = await viem.getWalletClients();
    const eventTicketNFT = await viem.deployContract("EventTicketNFT", []);

    return { publicClient, owner, attendee, recipient, outsider, eventTicketNFT };
  }

  async function mintedTicketFixture() {
    const fixture = await deployFixture();
    const hash = await fixture.eventTicketNFT.write.mintTicket(
      [
        fixture.attendee.account.address,
        sampleTicket.eventName,
        sampleTicket.venue,
        sampleTicket.startsAt,
        sampleTicket.seat,
        sampleTicket.tier,
      ],
      { account: fixture.owner.account },
    );
    await fixture.publicClient.waitForTransactionReceipt({ hash });
    return fixture;
  }

  await it("allows the owner/admin to mint a ticket NFT", async () => {
    const { eventTicketNFT, attendee } = await mintedTicketFixture();

    assert.equal((await eventTicketNFT.read.ownerOf([0n])).toLowerCase(), attendee.account.address.toLowerCase());
    assert.equal(await eventTicketNFT.read.balanceOf([attendee.account.address]), 1n);
    assert.equal(await eventTicketNFT.read.totalMinted(), 1n);
  });

  await it("prevents non-owner users from minting tickets", async () => {
    const { eventTicketNFT, attendee, outsider } = await deployFixture();

    await assert.rejects(
      eventTicketNFT.write.mintTicket(
        [
          attendee.account.address,
          sampleTicket.eventName,
          sampleTicket.venue,
          sampleTicket.startsAt,
          sampleTicket.seat,
          sampleTicket.tier,
        ],
        { account: outsider.account },
      ),
      /OwnableUnauthorizedAccount/,
    );
  });

  await it("returns ticket metadata and token URI for a minted ticket", async () => {
    const { eventTicketNFT } = await mintedTicketFixture();

    const metadata = await eventTicketNFT.read.getTicketMetadata([0n]);
    const tokenUri = await eventTicketNFT.read.tokenURI([0n]);

    assert.equal(metadata.eventName, sampleTicket.eventName);
    assert.equal(metadata.venue, sampleTicket.venue);
    assert.equal(metadata.seat, sampleTicket.seat);
    assert.equal(metadata.tier, sampleTicket.tier);
    assert.match(tokenUri, /^data:application\/json;base64,/);
  });

  await it("lists the NFTs owned by a wallet", async () => {
    const { eventTicketNFT, attendee } = await mintedTicketFixture();

    const tickets = await eventTicketNFT.read.getTicketsOfOwner([attendee.account.address]);
    assert.equal(tickets.length, 1);
    assert.equal(tickets[0]?.tokenId, 0n);
    assert.equal(tickets[0]?.eventName, sampleTicket.eventName);
  });

  await it("supports standard approve plus transferFrom ownership transfer", async () => {
    const { publicClient, eventTicketNFT, attendee, recipient } = await mintedTicketFixture();

    const approveHash = await eventTicketNFT.write.approve([recipient.account.address, 0n], {
      account: attendee.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });

    assert.equal((await eventTicketNFT.read.getApproved([0n])).toLowerCase(), recipient.account.address.toLowerCase());

    const transferHash = await eventTicketNFT.write.transferFrom(
      [attendee.account.address, recipient.account.address, 0n],
      { account: recipient.account },
    );
    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    assert.equal((await eventTicketNFT.read.ownerOf([0n])).toLowerCase(), recipient.account.address.toLowerCase());
    assert.equal(await eventTicketNFT.read.balanceOf([attendee.account.address]), 0n);
    assert.equal(await eventTicketNFT.read.balanceOf([recipient.account.address]), 1n);
  });

  await it("rejects transferFrom from an unauthorized account", async () => {
    const { eventTicketNFT, attendee, recipient, outsider } = await mintedTicketFixture();

    await assert.rejects(
      eventTicketNFT.write.transferFrom([attendee.account.address, recipient.account.address, 0n], {
        account: outsider.account,
      }),
      /ERC721InsufficientApproval/,
    );
  });
});
