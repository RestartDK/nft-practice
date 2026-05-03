# Exercise 2: ERC-20 Loyalty Points

This exercise implements a Web3 token management app for business loyalty points.

## Structure

- `contracts/LoyaltyPoints.sol`: ERC-20 token using OpenZeppelin
- `tests/LoyaltyPoints.test.ts`: Hardhat + viem contract tests
- `scripts/deploy.ts`: deploys the token and writes frontend config
- `app/`: Vite + React + TypeScript client using viem
- `../recordings/exercise-2-erc20-loyalty-points.webm`: browser E2E recording

## How To Run

Install dependencies:

```bash
cd implementation/exercise-2
bun install
cd app
bun install
```

Run tests:

```bash
cd implementation/exercise-2
bun run test
```

Deploy locally:

```bash
cd implementation/exercise-2
bun run node
bun run deploy:localhost
```

Run the frontend:

```bash
cd implementation/exercise-2/app
bun run dev
```

## How I Tested It

Contract tests:

```bash
cd implementation/exercise-2
bun run test
```

Frontend build:

```bash
cd implementation/exercise-2/app
bun run build
```

Browser E2E verification with `agent-browser` was recorded in:

- `implementation/recordings/exercise-2-erc20-loyalty-points.webm`

The recording shows the owner wallet minting loyalty points, a customer wallet receiving a balance, the non-owner/customer view where minting is disabled, and a customer transferring points to another wallet. Not the best to verify but a quick check that something happened :0

## Contract Test Cases

1. ERC-20 metadata: name, symbol, decimals
2. Owner/admin mint success
3. Non-owner mint failure
4. User transfer success
5. Balance and total supply changes after mint/transfer
6. Zero-amount mint rejection

## Design Choices

### On-chain

The token supply, balances, transfer rules, and owner-only minting authority are on-chain because these are the rules users need to trust. OpenZeppelin's ERC-20 implementation is used for standard compliance and safer behavior.

### Off-chain

The app keeps UI state, wallet display, form inputs, status messages, and formatting off-chain. Customer names or business records are not stored in the token contract; wallets are enough for token ownership.

## Security And Validation Notes

- Minting is restricted to the owner/deployer through OpenZeppelin `Ownable`.
- Minting to the zero address is rejected.
- Minting zero tokens is rejected.
- Transfers use standard ERC-20 `transfer`, which rejects insufficient balances and invalid recipients through OpenZeppelin logic.
