# Exercise 3: ERC-721 NFT Event Tickets

This exercise upgrades the HW-3 custom ticketing idea to use the ERC-721 NFT standard.

## Structure

- `contracts/EventTicketNFT.sol`: ERC-721 ticket NFT using OpenZeppelin
- `tests/EventTicketNFT.test.ts`: Hardhat + viem contract tests
- `scripts/deploy.ts`: deploys the NFT contract and writes frontend config
- `app/`: Vite + React + TypeScript client using viem
- `../recordings/exercise-3-erc721-event-tickets.webm`: browser E2E recording

## How To Run

Install dependencies:

```bash
cd implementation/exercise-3
bun install
cd app
bun install
```

Run tests:

```bash
cd implementation/exercise-3
bun run test
```

Deploy locally:

```bash
cd implementation/exercise-3
bun run node
bun run deploy:localhost
```

Run the frontend:

```bash
cd implementation/exercise-3/app
bun run dev
```

## How I Tested It

Contract tests:

```bash
cd implementation/exercise-3
bun run test
```

Frontend build:

```bash
cd implementation/exercise-3/app
bun run build
```

Browser E2E verification with `agent-browser` was recorded in:

- `implementation/recordings/exercise-3-erc721-event-tickets.webm`

The recording shows the owner minting an NFT ticket, a customer viewing the ticket metadata, approving another wallet, transferring the NFT, and the recipient wallet seeing ownership. Again this helps seeing what happened but best to verify manually as well.

The app also includes an optional **Transfer from** field on each listed ticket and an **Approved spender** section to call `transferFrom(owner, recipient, tokenId)` when the connected wallet is approved but does not own the NFT.

## Contract Test Cases

1. Owner/admin mint success
2. Non-owner mint failure
3. Metadata retrieval and `tokenURI` generation
4. Owner balance and owned ticket listing
5. Standard ERC-721 `approve` plus `transferFrom`
6. Unauthorized transfer rejection

## Design Choices

### On-chain

Ticket ownership, balances, approvals, and transfers use ERC-721. Each ticket also stores simple metadata on-chain:

- event name
- venue
- start time
- seat
- tier

I chose on-chain metadata for this homework because it makes the project self-contained and easy to review without requiring IPFS setup. The tradeoff is that storing strings on-chain is more expensive and public. A production system would usually store larger metadata off-chain through `tokenURI`/IPFS and keep only the URI or immutable hashes on-chain.

### Off-chain

The frontend keeps wallet connection state, forms, date formatting, status messages, and display layout off-chain. These do not need consensus or permanent storage.

## How ERC-721 Changed The App

In HW-3, ticket ownership was custom mapping logic in the ticketing contract. With ERC-721, ownership, balances, approvals, and transfers are standard. This makes the ticket easier to inspect in wallets and compatible with NFT tooling.

## How The Frontend Changed

The frontend now reads ERC-721 balance/ownership data and displays specific token IDs with metadata. Transfer uses standard NFT functions instead of custom ticket-transfer functions. The app includes approve and transfer forms so the standard ERC-721 flow is visible.

## Benefits Of NFTs For Event Tickets

- Every ticket is unique and can carry seat/tier/event metadata.
- Wallets and explorers understand ERC-721 ownership.
- Standard approvals and transfers reduce custom ownership logic.
- Tickets can integrate with marketplaces or wallet UIs more easily than custom mappings.

## Security And Validation Notes

- Minting is owner/admin-only.
- Minting to the zero address is rejected.
- Empty metadata fields are rejected.
- Start times must be in the future.
- Unauthorized `transferFrom` calls are rejected by ERC-721 approval rules.
