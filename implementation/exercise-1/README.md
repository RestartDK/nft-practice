# Exercise 1: Vending Machine on Sepolia

This exercise reuses the HW-3 vending machine dApp and deploys it to Ethereum Sepolia.

## Structure

- `contracts/VendingMachine.sol`: vending machine smart contract
- `tests/VendingMachine.test.ts`: Hardhat + viem contract tests
- `scripts/deploy.ts`: deploys locally or to Sepolia and writes frontend config
- `scripts/purchase-sepolia.ts`: submits one Sepolia purchase transaction using the local dev wallet
- `app/`: Vite + React + TypeScript client using viem
- `../recordings/exercise-1-vending-machine.webm`: local browser E2E recording
- `../recordings/exercise-1-sepolia-proof.webm`: Sepolia frontend proof recording

## Sepolia Proof

- Deployed contract: `0xd46cd77063a5e3e8ae20c4e2e5d2f209be9ea86c`
- Contract URL: <https://sepolia.etherscan.io/address/0xd46cd77063a5e3e8ae20c4e2e5d2f209be9ea86c>
- Purchase transaction: `0xee1192fd0190bb6025debfa438e45284e24c8f6dca1a9092f0b760fd2b1950cf`
- Purchase URL: <https://sepolia.etherscan.io/tx/0xee1192fd0190bb6025debfa438e45284e24c8f6dca1a9092f0b760fd2b1950cf>
- Buyer/deployer wallet: `0x3A39f8FD8475c0f4b17C616a13DCeF5078773408`

## How To Run

Install dependencies:

```bash
cd implementation/exercise-1
bun install
cd app
bun install
```

Run local tests:

```bash
cd implementation/exercise-1
bun run test
```

Deploy locally:

```bash
cd implementation/exercise-1
bun run node
bun run deploy:localhost
```

Deploy to Sepolia:

```bash
cd implementation/exercise-1
bun run deploy:sepolia
```

Run the frontend:

```bash
cd implementation/exercise-1/app
bun run dev
```

For Sepolia, `app/.env` should contain:

```env
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_CHAIN_ID=11155111
```

## How I Tested It

Contract tests:

```bash
cd implementation/exercise-1
bun run test
```

Frontend build:

```bash
cd implementation/exercise-1/app
bun run build
```

Sepolia deployment and purchase:

```bash
cd implementation/exercise-1
bun run deploy:sepolia
bun run purchase:sepolia
```

Browser E2E verification with `agent-browser` was recorded in:

- `implementation/recordings/exercise-1-vending-machine.webm`
- `implementation/recordings/exercise-1-sepolia-proof.webm`

I did this as a test to see how good an agent could show how this works when it has access to my private keys (oops).

## Contract Test Cases

1. Successful purchase of a product
2. Failed purchase because the payment is too low
3. Failed purchase because requested quantity exceeds stock
4. Failed admin action when a non-admin tries to restock
5. State update after purchase: stock decreases and ownership increases
6. Successful admin restock

## Design Choices

### On-chain

The product catalog, prices, stock, purchases, ownership quantities, admin address, and admin updates are stored on-chain. These are the trust-sensitive vending machine rules that every user should be able to verify.

### Off-chain

The frontend keeps wallet connection state, routing, form inputs, status messages, and display formatting off-chain. These are user-interface concerns and do not need permanent public blockchain storage.

## Moving From Local Hardhat/Ganache To Sepolia

The smart contract logic did not need to change. The main changes were deployment and frontend configuration:

- Hardhat needed a Sepolia RPC provider and deployer private key in `.env`.
- Transactions required real Sepolia test ETH and took longer than local Hardhat transactions.
- The frontend needed Sepolia chain ID `11155111`, a Sepolia RPC URL, and the deployed Sepolia contract address.
- Public transactions are visible on Etherscan, which gives external proof that the homework contract and purchase exist.

## Security And Validation Notes

- Invalid product ids, zero quantities, zero prices, inactive products, insufficient payment, and out-of-stock purchases are rejected.
- Restocking, repricing, pausing products, and withdrawals are admin-only.
- Important state changes emit events.
- Extra ETH sent during purchase is refunded.
