const express = require('express');
const fs = require('fs');
const path = require('path');
const { Web3 } = require('web3');

const router = express.Router();
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'abi', 'TestToken.json'), 'utf8'));

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;

const web3 = rpcUrl ? new Web3(rpcUrl) : new Web3();
let contract = null;
let ownerAddress = null;

if (contractAddress) {
  contract = new web3.eth.Contract(abi, contractAddress);
}

if (privateKey) {
  const normalizedPk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  ownerAddress = web3.eth.accounts.privateKeyToAccount(normalizedPk).address;
}

function isValidAddress(address) {
  return web3.utils.isAddress(address);
}

function toBaseUnits(amount, decimals) {
  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error('Amount must be a positive number');
  }

  const integerAmount = Math.floor(numeric);
  const decimalsValue = Number(decimals || 18);
  return BigInt(integerAmount * 10 ** decimalsValue);
}

function fromBaseUnits(value, decimals) {
  const rawValue = BigInt(value);
  const decimalsValue = Number(decimals || 18);
  const divisor = 10n ** BigInt(decimalsValue);
  const whole = rawValue / divisor;
  const fractional = rawValue % divisor;

  if (fractional === 0n) {
    return whole.toString();
  }

  const fractionalString = fractional.toString().padStart(decimalsValue, '0').replace(/0+$/, '');
  return `${whole}.${fractionalString}`;
}

async function getDecimals() {
  if (!contract) {
    throw new Error('Contract instance is not available');
  }
  return Number(await contract.methods.decimals().call());
}

async function buildTransaction(method, fromAddress, params) {
  const gas = await contract.methods[method](...params).estimateGas({ from: fromAddress });
  const gasPrice = await web3.eth.getGasPrice();
  const nonce = await web3.eth.getTransactionCount(fromAddress, 'pending');

  return {
    from: fromAddress,
    to: contractAddress,
    data: contract.methods[method](...params).encodeABI(),
    gas: gas.toString(),
    gasPrice: gasPrice.toString(),
    nonce
  };
}

router.post('/mint', async (req, res) => {
  try {
    if (!contract || !contractAddress) {
      return res.status(500).json({ message: 'Contract is not configured' });
    }

    if (!req.body || !req.body.to || !req.body.amount) {
      return res.status(400).json({ message: 'Recipient address and amount are required' });
    }

    if (!isValidAddress(req.body.to)) {
      return res.status(400).json({ message: 'Invalid Ethereum address' });
    }

    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive integer' });
    }

    if (!privateKey) {
      return res.status(500).json({ message: 'Private key is not configured' });
    }

    const decimals = await getDecimals();
    const baseAmount = toBaseUnits(amount, decimals);

    const owner = await contract.methods.owner().call();
    if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the owner wallet can mint tokens' });
    }

    const txData = await buildTransaction('mint', ownerAddress, [req.body.to, baseAmount]);
    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.json({
      message: 'Tokens minted successfully',
      transactionHash: receipt.transactionHash
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Failed to mint tokens' });
  }
});

router.post('/burn', async (req, res) => {
  try {
    if (!contract || !contractAddress) {
      return res.status(500).json({ message: 'Contract is not configured' });
    }

    if (!req.body || req.body.amount === undefined || req.body.amount === null || req.body.amount === '') {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive integer' });
    }

    if (!privateKey) {
      return res.status(500).json({ message: 'Private key is not configured' });
    }

    const decimals = await getDecimals();
    const baseAmount = toBaseUnits(amount, decimals);

    const owner = await contract.methods.owner().call();
    if (owner.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ message: 'Only the owner wallet can burn tokens' });
    }

    const txData = await buildTransaction('burn', ownerAddress, [baseAmount]);
    const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);
    const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);

    res.json({
      message: 'Tokens burned successfully',
      transactionHash: receipt.transactionHash
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Failed to burn tokens' });
  }
});

router.get('/balance/:address', async (req, res) => {
  try {
    if (!contract || !contractAddress) {
      return res.status(500).json({ message: 'Contract is not configured' });
    }

    const walletAddress = req.params.address;
    if (!isValidAddress(walletAddress)) {
      return res.status(400).json({ message: 'Invalid Ethereum address' });
    }

    const decimals = await getDecimals();
    const balance = await contract.methods.balanceOf(walletAddress).call();
    res.json({ balance: fromBaseUnits(balance, decimals) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || 'Failed to fetch balance' });
  }
});

module.exports = router;
