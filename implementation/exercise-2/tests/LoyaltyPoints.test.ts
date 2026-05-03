import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

describe("LoyaltyPoints", async () => {
  const { viem } = await network.create();

  async function deployFixture() {
    const publicClient = await viem.getPublicClient();
    const [owner, customer, recipient, outsider] = await viem.getWalletClients();
    const loyaltyPoints = await viem.deployContract("LoyaltyPoints", []);

    return { publicClient, owner, customer, recipient, outsider, loyaltyPoints };
  }

  await it("uses the expected ERC-20 name, symbol, and decimals", async () => {
    const { loyaltyPoints } = await deployFixture();

    assert.equal(await loyaltyPoints.read.name(), "Campus Loyalty Points");
    assert.equal(await loyaltyPoints.read.symbol(), "CLP");
    assert.equal(await loyaltyPoints.read.decimals(), 18);
  });

  await it("allows the owner/admin to mint loyalty points", async () => {
    const { publicClient, customer, loyaltyPoints } = await deployFixture();
    const amount = parseEther("125");

    const hash = await loyaltyPoints.write.mint([customer.account.address, amount]);
    await publicClient.waitForTransactionReceipt({ hash });

    assert.equal(await loyaltyPoints.read.balanceOf([customer.account.address]), amount);
    assert.equal(await loyaltyPoints.read.totalSupply(), amount);
  });

  await it("prevents non-owner users from minting", async () => {
    const { customer, outsider, loyaltyPoints } = await deployFixture();

    await assert.rejects(
      loyaltyPoints.write.mint([customer.account.address, parseEther("10")], {
        account: outsider.account,
      }),
      /OwnableUnauthorizedAccount/,
    );
  });

  await it("transfers loyalty points between users", async () => {
    const { publicClient, customer, recipient, loyaltyPoints } = await deployFixture();
    const minted = parseEther("50");
    const transferAmount = parseEther("12.5");

    const mintHash = await loyaltyPoints.write.mint([customer.account.address, minted]);
    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    const transferHash = await loyaltyPoints.write.transfer([recipient.account.address, transferAmount], {
      account: customer.account,
    });
    await publicClient.waitForTransactionReceipt({ hash: transferHash });

    assert.equal(await loyaltyPoints.read.balanceOf([customer.account.address]), minted - transferAmount);
    assert.equal(await loyaltyPoints.read.balanceOf([recipient.account.address]), transferAmount);
  });

  await it("rejects zero-amount mint requests", async () => {
    const { customer, loyaltyPoints } = await deployFixture();

    await assert.rejects(
      loyaltyPoints.write.mint([customer.account.address, 0n]),
      /InvalidMintAmount/,
    );
  });
});
