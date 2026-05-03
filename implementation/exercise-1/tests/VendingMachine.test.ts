import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { parseEther } from "viem";

const SEED_PRODUCTS = {
  names: ["Cold Brew", "Trail Mix", "Sparkling Water"],
  prices: [parseEther("0.002"), parseEther("0.0015"), parseEther("0.001")],
  stocks: [12n, 18n, 24n],
};

describe("VendingMachine", async () => {
  const { viem } = await network.create();

  async function deployFixture() {
    const publicClient = await viem.getPublicClient();
    const [admin, buyer, outsider] = await viem.getWalletClients();

    const vendingMachine = await viem.deployContract("VendingMachine", [
      SEED_PRODUCTS.names,
      SEED_PRODUCTS.prices,
      SEED_PRODUCTS.stocks,
    ]);

    return { publicClient, admin, buyer, outsider, vendingMachine };
  }

  await it("allows a successful purchase", async () => {
    const { publicClient, buyer, vendingMachine } = await deployFixture();

    const hash = await vendingMachine.write.purchase([0n, 2n], {
      account: buyer.account,
      value: SEED_PRODUCTS.prices[0] * 2n,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const ownedQuantity = await vendingMachine.read.getOwnedQuantity([buyer.account.address, 0n]);
    assert.equal(ownedQuantity, 2n);
  });

  await it("rejects purchases with insufficient payment", async () => {
    const { buyer, vendingMachine } = await deployFixture();

    await assert.rejects(
      vendingMachine.write.purchase([1n, 1n], {
        account: buyer.account,
        value: SEED_PRODUCTS.prices[1] - 1n,
      }),
      /WrongPayment/,
    );
  });

  await it("rejects purchases when stock is unavailable", async () => {
    const { buyer, vendingMachine } = await deployFixture();

    await assert.rejects(
      vendingMachine.write.purchase([2n, SEED_PRODUCTS.stocks[2] + 1n], {
        account: buyer.account,
        value: SEED_PRODUCTS.prices[2] * (SEED_PRODUCTS.stocks[2] + 1n),
      }),
      /OutOfStock/,
    );
  });

  await it("prevents non-admin users from restocking", async () => {
    const { outsider, vendingMachine } = await deployFixture();

    await assert.rejects(
      vendingMachine.write.restockProduct([0n, 5n], { account: outsider.account }),
      /Unauthorized/,
    );
  });

  await it("updates stock and ownership after a purchase", async () => {
    const { publicClient, buyer, vendingMachine } = await deployFixture();

    const beforeProduct = await vendingMachine.read.getProduct([0n]);
    const hash = await vendingMachine.write.purchase([0n, 3n], {
      account: buyer.account,
      value: SEED_PRODUCTS.prices[0] * 3n,
    });
    await publicClient.waitForTransactionReceipt({ hash });

    const afterProduct = await vendingMachine.read.getProduct([0n]);
    const ownedProducts = await vendingMachine.read.getOwnedProducts([buyer.account.address]);

    assert.equal(afterProduct.stock, beforeProduct.stock - 3n);
    assert.equal(ownedProducts[0]?.productId, 0n);
    assert.equal(ownedProducts[0]?.quantity, 3n);
  });

  await it("allows the admin to restock products", async () => {
    const { publicClient, admin, vendingMachine } = await deployFixture();

    const hash = await vendingMachine.write.restockProduct([0n, 4n], { account: admin.account });
    await publicClient.waitForTransactionReceipt({ hash });

    const product = await vendingMachine.read.getProduct([0n]);
    assert.equal(product.stock, SEED_PRODUCTS.stocks[0] + 4n);
  });
});
