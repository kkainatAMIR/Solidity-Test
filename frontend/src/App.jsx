import { useEffect, useMemo, useState } from 'react';
import Web3 from 'web3';
import ActionCard from './components/ActionCard';
import contractAbi from './abi/TestToken.json';

const CONTRACT_ADDRESS = '0x1dC460eD6a81bBC822924Ae90D42bb0872AcFcae';
const SEPOLIA_CHAIN_ID = '0xaa36a7';
const isValidAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value);

function App() {
  const [mintForm, setMintForm] = useState({ to: '', amount: '' });
  const [burnForm, setBurnForm] = useState({ amount: '' });
  const [balanceForm, setBalanceForm] = useState({ address: '' });
  const [minting, setMinting] = useState(false);
  const [burning, setBurning] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState(null);
  const [balance, setBalance] = useState('');
  const [lastTxHash, setLastTxHash] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [contract, setContract] = useState(null);

  const explorerUrl = useMemo(() => 'https://sepolia.etherscan.io/tx/', []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    const web3Instance = new Web3(window.ethereum);
    const contractInstance = new web3Instance.eth.Contract(contractAbi, CONTRACT_ADDRESS);
    setContract(contractInstance);

    window.ethereum.request({ method: 'eth_accounts' }).then((accounts) => {
      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setBalanceForm((prev) => ({ ...prev, address: accounts[0] }));
      }
    }).catch(() => {});
  }, []);

  const showToast = (type, text) => {
    setMessage({ type, text });
    window.setTimeout(() => setMessage(null), 4000);
  };

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      showToast('error', 'MetaMask is not installed.');
      return;
    }

    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      if (chainId !== SEPOLIA_CHAIN_ID) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: SEPOLIA_CHAIN_ID }]
        });
      }

      const web3Instance = new Web3(window.ethereum);
      const contractInstance = new web3Instance.eth.Contract(contractAbi, CONTRACT_ADDRESS);
      setContract(contractInstance);
      setWalletAddress(account);
      setBalanceForm((prev) => ({ ...prev, address: account }));
      showToast('success', `Connected ${account.slice(0, 6)}...${account.slice(-4)}`);
    } catch (error) {
      showToast('error', error.message || 'Could not connect wallet.');
    } finally {
      setConnecting(false);
    }
  };

  const toHumanReadable = (value, decimals) => {
    const rawValue = BigInt(value);
    const divisor = 10n ** BigInt(decimals);
    const whole = rawValue / divisor;
    const fractional = rawValue % divisor;

    if (fractional === 0n) {
      return whole.toString();
    }

    const fractionalString = fractional.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${whole}.${fractionalString}`;
  };

  const handleMint = async (event) => {
    event.preventDefault();
    if (!walletAddress) {
      showToast('error', 'Connect your wallet first.');
      return;
    }

    if (!mintForm.to || !mintForm.amount) {
      showToast('error', 'Recipient address and amount are required.');
      return;
    }

    if (!isValidAddress(mintForm.to)) {
      showToast('error', 'Please enter a valid Ethereum address.');
      return;
    }

    const amount = Number(mintForm.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      showToast('error', 'Amount must be a positive integer.');
      return;
    }

    try {
      setMinting(true);
      const decimals = Number(await contract.methods.decimals().call());
      const baseAmount = BigInt(amount) * 10n ** BigInt(decimals);
      const receipt = await contract.methods.mint(mintForm.to, baseAmount).send({ from: walletAddress });
      setLastTxHash(receipt.transactionHash);
      showToast('success', `Minted successfully. Tx: ${receipt.transactionHash}`);
      setMintForm({ to: '', amount: '' });
    } catch (error) {
      showToast('error', error.message || 'Minting failed.');
    } finally {
      setMinting(false);
    }
  };

  const handleBurn = async (event) => {
    event.preventDefault();
    if (!walletAddress) {
      showToast('error', 'Connect your wallet first.');
      return;
    }

    if (!burnForm.amount) {
      showToast('error', 'Amount is required.');
      return;
    }

    const amount = Number(burnForm.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      showToast('error', 'Amount must be a positive integer.');
      return;
    }

    try {
      setBurning(true);
      const decimals = Number(await contract.methods.decimals().call());
      const baseAmount = BigInt(amount) * 10n ** BigInt(decimals);
      const receipt = await contract.methods.burn(baseAmount).send({ from: walletAddress });
      setLastTxHash(receipt.transactionHash);
      showToast('success', `Burned successfully. Tx: ${receipt.transactionHash}`);
      setBurnForm({ amount: '' });
    } catch (error) {
      showToast('error', error.message || 'Burning failed.');
    } finally {
      setBurning(false);
    }
  };

  const handleBalance = async (event) => {
    event.preventDefault();
    const address = balanceForm.address || walletAddress;
    if (!address) {
      showToast('error', 'Wallet address is required.');
      return;
    }

    if (!isValidAddress(address)) {
      showToast('error', 'Please enter a valid Ethereum address.');
      return;
    }

    try {
      setLoadingBalance(true);
      const decimals = Number(await contract.methods.decimals().call());
      const rawBalance = await contract.methods.balanceOf(address).call();
      setBalance(toHumanReadable(rawBalance, decimals));
      showToast('success', 'Balance loaded successfully.');
    } catch (error) {
      showToast('error', error.message || 'Could not fetch balance.');
    } finally {
      setLoadingBalance(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-cyan-500/20 bg-slate-900/70 p-6 shadow-2xl shadow-cyan-900/20 backdrop-blur-xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-400">Sepolia Token Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Manage your ERC-20 token operations with confidence.</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">
                Connect MetaMask, then mint, burn, and inspect balances directly on Sepolia.
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
              <p className="font-medium">Contract</p>
              <p className="mt-1 break-all text-cyan-100">0x1dC460eD6a81bBC822924Ae90D42bb0872AcFcae</p>
            </div>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 backdrop-blur">
          <div>
            <p className="text-sm text-slate-400">Wallet status</p>
            <p className="mt-1 font-medium text-slate-100">{walletAddress ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}` : 'Not connected'}</p>
          </div>
          <button onClick={connectWallet} disabled={connecting} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
            {connecting ? 'Connecting...' : walletAddress ? 'Reconnect Wallet' : 'Connect Wallet'}
          </button>
        </div>

        {message && (
          <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
            {message.text}
          </div>
        )}

        <main className="grid gap-6 lg:grid-cols-3">
          <ActionCard title="Mint Tokens" badge="Owner Only" accent="cyan">
            <form className="mt-6 space-y-4" onSubmit={handleMint}>
              <label className="block text-sm text-slate-300">
                Recipient Address
                <input value={mintForm.to} onChange={(e) => setMintForm({ ...mintForm, to: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 outline-none ring-0 transition focus:border-cyan-400" placeholder="0x..." />
              </label>
              <label className="block text-sm text-slate-300">
                Amount
                <input type="number" min="1" value={mintForm.amount} onChange={(e) => setMintForm({ ...mintForm, amount: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-cyan-400" placeholder="50" />
              </label>
              <button disabled={minting} className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
                {minting ? 'Minting...' : 'Mint'}
              </button>
            </form>
          </ActionCard>

          <ActionCard title="Burn Tokens" badge="Owner Only" accent="fuchsia">
            <form className="mt-6 space-y-4" onSubmit={handleBurn}>
              <label className="block text-sm text-slate-300">
                Amount
                <input type="number" min="1" value={burnForm.amount} onChange={(e) => setBurnForm({ ...burnForm, amount: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-fuchsia-400" placeholder="20" />
              </label>
              <button disabled={burning} className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500 to-violet-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
                {burning ? 'Burning...' : 'Burn'}
              </button>
            </form>
          </ActionCard>

          <ActionCard title="Check Balance" badge="Read Only" accent="emerald">
            <form className="mt-6 space-y-4" onSubmit={handleBalance}>
              <label className="block text-sm text-slate-300">
                Wallet Address
                <input value={balanceForm.address} onChange={(e) => setBalanceForm({ ...balanceForm, address: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 outline-none transition focus:border-emerald-400" placeholder="0x..." />
              </label>
              <button disabled={loadingBalance} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-600 px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70">
                {loadingBalance ? 'Loading...' : 'Get Balance'}
              </button>
            </form>
            <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="text-slate-300">Current balance</p>
              <p className="mt-2 text-3xl font-semibold">{balance || '—'}</p>
            </div>
          </ActionCard>
        </main>

        {lastTxHash && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300 backdrop-blur">
            <p className="font-medium">Latest transaction</p>
            <a href={`${explorerUrl}${lastTxHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-cyan-400 underline decoration-cyan-400/40 underline-offset-4">
              {lastTxHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
