# HW-4 Implementation

## Exercises

- `exercise-1/`: Vending machine deployed to Sepolia
- `exercise-2/`: ERC-20 loyalty points app
- `exercise-3/`: ERC-721 NFT event ticket app

Each exercise has its own `README.md` with run instructions, test cases, and design notes.

## Browser Recordings

`agent-browser` recordings are in `recordings/`:

- `recordings/exercise-1-vending-machine.webm`
- `recordings/exercise-1-sepolia-proof.webm`
- `recordings/exercise-2-erc20-loyalty-points.webm`
- `recordings/exercise-3-erc721-event-tickets.webm`

The local recordings use a local Hardhat node and an injected local EIP-1193 test provider so the browser can sign with Hardhat's unlocked development accounts without MetaMask popups. The Sepolia proof recording is read-only and shows the public Sepolia contract state after the recorded purchase transaction.
