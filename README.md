# Smart Contracts, On-Chain State, Off-Chain Logic, and Application Design

In the previous assignment, you successfully built and tested a vending machine and an event ticketing application locally. Now, it is time to take your applications to the public blockchain and learn how to interact with industry-standard token contracts.

In this assignment, you will deploy your existing contracts to the Sepolia testnet, build a management interface for your own ERC-20 token, and evaluate how token standards can improve your previous application designs.

## Expected Submissions

Your solutions should follow the same structure as Assignment 3. Put your source code in an `implementation/` folder so it can be reviewed and feedback can be provided.

Put the smart contract, client app (GUI) code, and tests in:

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

For each exercise, also include a short `README.md` file that explains:

- How you tested the project and what your test cases were.
- The main design choices, especially what is on-chain and what is off-chain.

## Rules and Constraints

Use the Ethereum development environment we saw in class: Ganache, Hardhat, and Python `web3`.

For an example, refer to this simple public GitHub repository:

<https://github.com/milangroshev/harthat-web3-tutorial/blob/main/README.md>

If you are already familiar with another Ethereum development environment, you may use it.

You may use Solidity libraries and frontend libraries, but you must understand the role of each major component you use and be able to explain your choices.

You may use AI tools and LLMs to help you, but you are responsible for the final design and implementation. If code works but its design choices are weak or inconsistent, you will lose points.

Keep your smart contracts small and clear. Prefer readable design over unnecessary complexity. Think carefully about what information should be stored on-chain. On-chain storage is expensive, public, and permanent. For each exercise, document your design choices. The focus is not only on whether the code runs, but also on why you modeled the contract the way you did. Try to understand the security implications of your design. Think about access control, payments, replay of actions, invalid state transitions, and abuse by malicious users.

## Minimum Contract Quality Requirements

For all smart contract exercises, your contracts must satisfy the following minimum requirements:

- Validate important inputs and reject invalid actions.
- Use clear error handling with `require(...)`, `revert(...)`, or custom errors where appropriate.
- Emit events for important state changes.
- Include at least one restricted admin-only function where relevant.
- Keep the contract design simple and avoid unnecessary storage or unnecessary features.
- Document the purpose of each public function with short comments.
- Think carefully about who is allowed to call each function and when.

## Exercise 1: Deploying to a Public Testnet (Sepolia)

In this exercise, you will move your Vending Machine smart contract out of your local environment and deploy it to the Ethereum Sepolia testnet. You will then connect your existing client application so that users can buy products using real testnet transactions.

Your assignment should include the following steps:

1. **Wallet Setup**
   - Create a new Sepolia Ethereum wallet specifically for development.
   - You can use MetaMask or write Python code that generates a Sepolia Ethereum wallet.

2. **Acquire Test ETH**
   - Use a Sepolia faucet to fund your developer wallet with testnet ETH.
   - Example faucet: <https://cloud.google.com/application/web3/faucet>
   - This is a similar process to Assignment 3, Exercise 2, but with a different wallet type and faucet.
   - You can fund from a single faucet once every 24 hours.

3. **Provider Configuration**
   - Sign up for a node provider service like Infura or Alchemy.
   - Configure your Hardhat deployment scripts to route through this provider and deploy your vending machine contract to Sepolia.

4. **App Integration**
   - Update your frontend client application from the previous assignment to connect to the new Sepolia contract address.
   - Purchase a product from the vending machine using your testnet wallet.

Answer the following questions:

- What do you notice when you move your smart contract from an emulated blockchain like Ganache to a public blockchain?
- Did you need to change anything on the smart contract side?
- What about your frontend?

### Submission Requirements

Put the code in:

```text
implementation/exercise-1/contracts/
implementation/exercise-1/app/
implementation/exercise-1/tests/
```

Also provide:

- The Sepolia block explorer/Etherscan URL for your deployed smart contract.
- The block explorer URLs or transaction hashes proving you successfully purchased products from the machine.
- A proof of homework using the fact that you deployed your smart contract on a public network.

## Exercise 2: Build an ERC-20 Token Management App

You will implement a Web3 application that allows a business, acting as the admin/deployer/owner, to issue loyalty points to customers as ERC-20 tokens. Customers can view their balances and transfer points to other users.

Use the Ethereum development environment we saw in class: Ganache, Hardhat, and Python `web3`.

For an example, refer to this simple public GitHub repository:

<https://github.com/milangroshev/harthat-web3-tutorial/blob/main/README.md>

If you are already familiar with another Ethereum development environment, you may use it.

If you want to deploy it to a testnet such as Sepolia, that is also fine.

### Minimum Technical Requirements

1. **Smart Contract**
   - Create an ERC-20 contract.
   - You may use the OpenZeppelin ERC-20 library to ensure security and standard compliance.

2. **Minting: Admin/Deployer/Owner Only**
   - The deployer of the contract should be able to mint new tokens and send them to specific wallet addresses, such as rewarding a customer.

3. **Token Transfers**
   - Users must be able to send their tokens to another user's wallet address.

4. **Client App/GUI**
   - Build a simple client interface that allows a user to:
     - Connect their wallet.
     - View their current token balance.
     - Execute a transfer to another address.
   - It should also include a separate admin/deployer/owner interface for minting.

> Note: This is a blockchain course. A nice client app is cool, but it will not be the main focus of evaluation. The smart contract implementation, app design, and design decisions will be evaluated.

### Source Code to Submit

Put the code in:

```text
implementation/exercise-2/contracts/
implementation/exercise-2/app/
implementation/exercise-2/tests/
```

For this exercise, also include a short `README.md` file in the implementation folder that explains:

- How you tested the project and what your test cases were.
- The main design choices, especially what is on-chain and what is off-chain.

## Exercise 3: ERC-721 NFT Event Tickets

In Assignment 3, Exercise 2, you built a decentralized event ticketing application and handled ticket ownership and transfers using your own custom logic. In this exercise, you will upgrade that app by implementing the industry standard for non-fungible tokens: ERC-721.

Because every event ticket is unique, such as having a specific date, seat number, or VIP tier, tickets are well modeled as NFTs. You will write new smart contract logic using the ERC-721 standard and update your frontend to interact with it.

Use the Ethereum development environment we saw in class: Ganache, Hardhat, and Python `web3`.

For an example, refer to this simple public GitHub repository:

<https://github.com/milangroshev/harthat-web3-tutorial/blob/main/README.md>

If you are already familiar with another Ethereum development environment, you may use it.

If you want to deploy it to a testnet such as Sepolia, that is also fine.

### Minimum Technical Requirements

1. **Smart Contract: ERC-721**
   - Create an ERC-721 smart contract to represent event tickets.
   - You are highly encouraged to use the OpenZeppelin ERC-721 library to ensure security and standard compliance.
   - The contract must allow an admin/deployer/owner to mint new NFT tickets.
   - Each ticket must have associated metadata, such as event name and seat number.
   - You must decide whether to store this data entirely on-chain or use a `tokenURI` pointing to off-chain storage, such as IPFS. Document why you chose that approach.

2. **Ticket Swap/Resale Logic**
   - Implement a mechanism for a user to transfer or sell their NFT ticket to another user.
   - You must use standard ERC-721 functions such as `approve()` and `transferFrom()` to handle ownership transfer securely.

3. **Client App: Frontend Updates**
   - Update your frontend from Assignment 3 so that it reads the user's ERC-721 token balance and displays their specific NFT tickets.
   - Provide a UI for the user to initiate a transfer or sale of their ticket to another wallet address.

> Note: This is a blockchain course. A nice client app is cool, but it will not be the main focus of evaluation. The smart contract implementation, app design, and design decisions will be evaluated.

### Source Code to Submit

Put the code in:

```text
implementation/exercise-3/contracts/
implementation/exercise-3/app/
implementation/exercise-3/tests/
```

For this exercise, also include a short `README.md` file in the implementation folder that explains:

- How you tested the project and what your test cases were.
- The main design choices, especially what is on-chain and what is off-chain.
- How the app changed with the introduction of ERC-721.
- How the frontend app changed with the introduction of ERC-721.
- Whether there are any benefits of using NFTs for this use case.
