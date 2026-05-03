# HW-4 End-to-End Plan

## Scope

Complete `/Users/danielkumlin/University/blockchain/hws/hw-4` from `README.md`:

1. Deploy the HW-3 vending machine contract to Ethereum Sepolia and connect the app.
2. Build an ERC-20 loyalty points management dApp.
3. Build an ERC-721 NFT event ticketing dApp.

We will use the same general Ethereum environment as HW-3: Hardhat, viem, React/Vite, MetaMask, and Sepolia for Exercise 1.

## Current Sepolia Setup

### Network

- Public testnet: Ethereum Sepolia
- Chain ID: `11155111`
- Block explorer: `https://sepolia.etherscan.io`

### RPC Provider

Alchemy Sepolia HTTPS RPC URL:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_CHAIN_ID=11155111
```

Actual RPC keys must stay only in local `.env` files and should not be committed.

### Wallet

Use a MetaMask development wallet on Ethereum Sepolia.

Required wallet info to fill in locally:

```env
SEPOLIA_DEPLOYER_ADDRESS=0xYOUR_PUBLIC_WALLET_ADDRESS
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_FOR_THE_SAME_METAMASK_ACCOUNT
```

Important:

- `SEPOLIA_DEPLOYER_ADDRESS` is public and safe to record.
- `SEPOLIA_PRIVATE_KEY` must stay only in local `.env` files.
- Do not paste the private key in chat.
- Do not commit `.env` files.
- Confirm the deployer wallet has Sepolia ETH from the faucet before deploying.

## Permission For Local `.env` Files

For this assignment, the coding assistant is allowed to create and read local `.env` files inside the HW-4 project folders as needed to configure deployment and frontend apps.

Allowed examples:

- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-1/.env`
- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-1/app/.env`
- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-2/.env`
- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-2/app/.env`
- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-3/.env`
- `/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-3/app/.env`

Safety rule: the assistant may verify that sensitive values exist, but should not print the private key in terminal output or final responses.

## Repository Setup Tasks

1. Add/update `.gitignore` in HW-4 to ignore:
   - `node_modules/`
   - `dist/`
   - `artifacts/`
   - `cache/`
   - `.env`
   - `.env.*`
   - local SQLite database files if any
2. Create `implementation/` structure:

```text
implementation/exercise-1/contracts/
implementation/exercise-1/app/
implementation/exercise-1/tests/

implementation/exercise-2/contracts/
implementation/exercise-2/app/
implementation/exercise-2/tests/

implementation/exercise-3/contracts/
implementation/exercise-3/app/
implementation/exercise-3/tests/
```

## Exercise 1 Plan: Vending Machine On Sepolia

Base source:

```text
/Users/danielkumlin/University/blockchain/hws/hw-3/implementation/exercise-1
```

Target source:

```text
/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-1
```

Tasks:

1. Copy HW-3 Exercise 1 vending machine contract, tests, deploy script, and app.
2. Add Sepolia network support to `hardhat.config.ts`.
3. Add `dotenv` or equivalent environment loading if needed.
4. Create `.env.example` with placeholders.
5. Create local `.env` with:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_PRIVATE_KEY=0xYOUR_PRIVATE_KEY
SEPOLIA_DEPLOYER_ADDRESS=0xYOUR_PUBLIC_WALLET_ADDRESS
```

6. Deploy to Sepolia:

```bash
cd /Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-1
bun install
bun run test
bun run deploy:sepolia
```

7. Deployment script should write frontend config with:
   - contract address
   - Sepolia chain ID `11155111`
   - ABI
8. Create/update app `.env`:

```env
VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
VITE_CHAIN_ID=11155111
```

9. Run frontend:

```bash
cd /Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-1/app
bun install
bun run dev
```

10. In browser:
    - switch MetaMask to Ethereum Sepolia
    - connect wallet
    - buy at least one vending machine product
11. Record proof in Exercise 1 README:
    - deployed contract address
    - Sepolia Etherscan contract URL
    - purchase transaction hash
    - Sepolia Etherscan transaction URL
    - notes answering README questions:
      - what changed moving from local chain to public testnet
      - whether contract changed
      - what frontend/deployment config changed

## Exercise 2 Plan: ERC-20 Loyalty Points

Target source:

```text
/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-2
```

Contract design:

- Use OpenZeppelin ERC-20.
- Token example:
  - Name: `Campus Loyalty Points`
  - Symbol: `CLP`
  - Decimals: standard ERC-20 default `18`
- Owner/deployer can mint tokens to customer wallets.
- Users can transfer tokens with standard ERC-20 `transfer`.

Tasks:

1. Create Hardhat project files.
2. Install OpenZeppelin contracts.
3. Write `LoyaltyPoints.sol`.
4. Write tests for:
   - token name/symbol
   - owner/admin mint success
   - non-owner mint failure
   - transfer success
   - balances after mint/transfer
5. Build React/Vite app that can:
   - connect MetaMask
   - show connected wallet
   - show token balance
   - transfer tokens
   - show admin mint form only when connected wallet is owner/deployer
6. Add README documenting:
   - tests
   - on-chain choices: token balances, supply, transfers, mint authority
   - off-chain choices: UI state, forms, display formatting

Exercise 2 can run locally first. Sepolia deployment is optional unless we decide to also deploy it publicly.

## Exercise 3 Plan: ERC-721 NFT Event Tickets

Base idea:

```text
/Users/danielkumlin/University/blockchain/hws/hw-3/implementation/exercise-2
```

Target source:

```text
/Users/danielkumlin/University/blockchain/hws/hw-4/implementation/exercise-3
```

Contract design:

- Use OpenZeppelin ERC-721.
- Each ticket is an NFT.
- Owner/admin mints ticket NFTs.
- Store simple metadata on-chain for homework clarity:
  - event name
  - venue/date or startsAt
  - seat number
  - tier
- Implement transfer/resale using standard ERC-721 functions:
  - `approve()`
  - `transferFrom()`
  - `safeTransferFrom()`
- Optionally include a small listing/resale helper contract/function if it keeps the frontend clearer, but avoid unnecessary complexity.

Tasks:

1. Create Hardhat project files.
2. Install OpenZeppelin contracts.
3. Write `EventTicketNFT.sol`.
4. Write tests for:
   - admin mint success
   - non-admin mint failure
   - metadata retrieval
   - owner balance and ownership
   - approval and `transferFrom`
   - rejected transfer by unauthorized account
5. Build/update frontend to:
   - connect MetaMask
   - show owned NFT tickets
   - show ticket metadata
   - approve/transfer a ticket to another wallet
   - optionally list/buy if resale helper is implemented
6. Add README documenting:
   - tests
   - on-chain vs off-chain metadata choice
   - how ERC-721 changed the app compared to HW-3 custom ticketing
   - frontend changes
   - benefits and tradeoffs of NFTs for event tickets

## Final Submission Checklist

For every exercise:

- Contract code is in `contracts/`.
- App/client code is in `app/`.
- Tests are in `tests/`.
- `README.md` explains tests and design choices.
- Tests pass.
- Frontend builds.

Exercise 1 extra proof:

- Sepolia deployed contract URL:

```text
https://sepolia.etherscan.io/address/DEPLOYED_CONTRACT_ADDRESS
```

- Product purchase transaction URL:

```text
https://sepolia.etherscan.io/tx/PURCHASE_TX_HASH
```

- Public deployer wallet address:

```text
0xYOUR_PUBLIC_WALLET_ADDRESS
```

- Do not include private key in submitted files.
