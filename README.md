# ERC-20 Token Management DApp

A full-stack token management application with a React + Vite frontend, an Express + web3.js backend, and an ERC-20 token contract interface for Sepolia.

## Project Structure

- backend/ — Express API and contract integration
- frontend/ — React dashboard UI
- contract/ — Solidity contract source
- README.md — setup and deployment guide

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

```bash
cd frontend
npm install
```

## Environment Configuration

Create a backend environment file:

```bash
cd backend
cp .env.example .env
```

Update the variables in the backend .env file:

```env
RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
PRIVATE_KEY=your_private_key_here
CONTRACT_ADDRESS=0x1dC460eD6a81bBC822924Ae90D42bb0872AcFcae
PORT=3000
```

## Run the Application

### Start the backend

```bash
cd backend
npm start
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The frontend will be available at http://localhost:5173 and the backend at http://localhost:3000.

## Wallet Setup

1. Install MetaMask in your browser.
2. Switch MetaMask to the Sepolia network.
3. Connect the wallet from the app header.
4. The app will call the deployed contract directly from the browser for mint, burn, and balance checks.

## Deploying the Smart Contract

Use Remix or Hardhat to deploy the ERC-20 contract to Sepolia, then update the deployed address in the backend .env file.

Example Solidity contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestToken is ERC20, Ownable {
    constructor() ERC20("TestToken", "STT") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(uint256 amount) public onlyOwner {
        _burn(msg.sender, amount);
    }
}
```

## Notes

- The backend uses web3.js to communicate with the deployed Sepolia contract.
- Mint and burn operations are signed by the owner wallet using the configured private key.
- The frontend validates addresses and amount inputs before calling the API.
