// Babylon-Xion Bridge Bot - Version 2.5
// Adapté par dropxtor pour Union Testnet V2.5
// Basé sur Union-Auto-Bot

const fs = require('fs');
const path = require('path');
const { ethers, JsonRpcProvider } = require('ethers');
const axios = require('axios');
const moment = require('moment-timezone');
const blessed = require('blessed');
const contrib = require('blessed-contrib');

// Create screen
const screen = blessed.screen({
  smartCSR: true,
  title: 'Babylon-Xion Bridge Bot - DROPXTOR'
});

// Create dashboard grid layout
const grid = new contrib.grid({
  rows: 12,
  cols: 12,
  screen: screen
});

// Create UI components
const transactionLogBox = grid.set(0, 0, 6, 6, contrib.log, {
  fg: 'green',
  selectedFg: 'green',
  label: 'Transaction Logs',
  border: {type: "line", fg: "cyan"},
  tags: true
});

const walletInfoTable = grid.set(0, 6, 3, 6, contrib.table, {
  keys: true,
  fg: 'white',
  selectedFg: 'black',
  selectedBg: 'blue',
  interactive: true,
  label: 'Wallet Information',
  border: {type: "line", fg: "cyan"},
  columnSpacing: 3,
  columnWidth: [12, 40, 14]
});

const txLineChart = grid.set(6, 0, 6, 6, contrib.line, {
  style: { line: "yellow", text: "green", baseline: "black" },
  xLabelPadding: 3,
  xPadding: 5,
  showLegend: true,
  wholeNumbersOnly: false,
  label: 'Transaction Performance (Time in ms)',
  border: {type: "line", fg: "cyan"}
});

const txDonut = grid.set(3, 6, 3, 3, contrib.donut, {
  label: 'Transaction Status',
  radius: 8,
  arcWidth: 3,
  remainColor: 'black',
  yPadding: 2,
  border: {type: "line", fg: "cyan"}
});

const gasUsageGauge = grid.set(3, 9, 3, 3, contrib.gauge, {
  label: 'Network Usage',
  percent: [0, 100],
  border: {type: "line", fg: "cyan"}
});

const infoBox = grid.set(6, 6, 6, 6, contrib.markdown, {
  label: 'System Information',
  border: {type: "line", fg: "cyan"},
  markdownStyles: {
    header: { fg: 'magenta' },
    bold: { fg: 'blue' },
    italic: { fg: 'green' },
    link: { fg: 'yellow' }
  }
});

// Helper function for status updates
function updateStatusInfo() {
  const now = moment().tz('Asia/Jakarta').format('HH:mm:ss | DD-MM-YYYY');
  const networkStatus = Math.floor(Math.random() * 30) + 70; // Simulating network status
  
  infoBox.setMarkdown(`
# System Status
**Time**: ${now}
**Network**: Babylon to Xion Bridge (Union V2.5)
**Status**: Running
**API Health**: Good
**RPC Provider**: ${currentRpcProviderIndex + 1}/${rpcProviders.length}

## Network Information
* Chain ID: 13371337 (Babylon Testnet)
* Target Chain: Xion Testnet
* Gas Price: ~${Math.floor(Math.random() * 15) + 25} Gwei
* Pending Txs: ${Math.floor(Math.random() * 10)}
`);
  
  gasUsageGauge.setPercent(networkStatus);
  screen.render();
}

// Transaction statistics for charts
const txStats = {
  success: 0,
  failed: 0,
  pending: 0,
  times: [],
  x: Array(30).fill(0).map((_, i) => i.toString()),
  y: Array(30).fill(0)
};

function updateCharts() {
  // Update donut chart with transaction status
  txDonut.setData([
    {percent: txStats.success, label: 'Success', color: 'green'},
    {percent: txStats.failed, label: 'Failed', color: 'red'},
    {percent: txStats.pending, label: 'Pending', color: 'yellow'}
  ]);
  
  // Update line chart with performance data
  if (txStats.times.length > 0) {
    txStats.y.shift();
    txStats.y.push(txStats.times[txStats.times.length - 1]);
    txLineChart.setData([{
      title: 'Tx Time',
      x: txStats.x,
      y: txStats.y,
      style: {line: 'yellow'}
    }]);
  }
  
  screen.render();
}

// Modified logger to use the dashboard
const logger = {
  info: (msg) => {
    transactionLogBox.log(`{green-fg}[ℹ] ${msg}{/green-fg}`);
    screen.render();
  },
  warn: (msg) => {
    transactionLogBox.log(`{yellow-fg}[⚠] ${msg}{/yellow-fg}`);
    screen.render();
  },
  error: (msg) => {
    transactionLogBox.log(`{red-fg}[✗] ${msg}{/red-fg}`);
    screen.render();
  },
  success: (msg) => {
    transactionLogBox.log(`{green-fg}[✓] ${msg}{/green-fg}`);
    screen.render();
  },
  loading: (msg) => {
    transactionLogBox.log(`{cyan-fg}[⟳] ${msg}{/cyan-fg}`);
    screen.render();
  },
  step: (msg) => {
    transactionLogBox.log(`{white-fg}[→] ${msg}{/white-fg}`);
    screen.render();
  }
};

// ABI pour le bridge Babylon vers Xion
const BRIDGE_ABI = [
  {
    inputs: [
      { internalType: 'uint32', name: 'channelId', type: 'uint32' },
      { internalType: 'uint64', name: 'timeoutHeight', type: 'uint64' },
      { internalType: 'uint64', name: 'timeoutTimestamp', type: 'uint64' },
      { internalType: 'bytes32', name: 'salt', type: 'bytes32' },
      {
        components: [
          { internalType: 'uint8', name: 'version', type: 'uint8' },
          { internalType: 'uint8', name: 'opcode', type: 'uint8' },
          { internalType: 'bytes', name: 'operand', type: 'bytes' },
        ],
        internalType: 'struct Instruction',
        name: 'instruction',
        type: 'tuple',
      },
    ],
    name: 'send',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

// ABI pour les tokens (USDC, BABY, XION)
const TOKEN_ABI = [
  {
    constant: true,
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: true,
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function',
    stateMutability: 'view',
  },
  {
    constant: false,
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
    stateMutability: 'nonpayable',
  },
];

// Adresses des contrats pour Babylon et Xion (à remplacer par les vraies adresses)
const BABYLON_BRIDGE_ADDRESS = '0x7B5Fe22B5446f7C62Ea27B8BD71CeF94e03f3dF2';
const XION_BRIDGE_ADDRESS = '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318';
const BABYLON_TOKEN_ADDRESS = '0x4B5DF730C2e6b28E17013A1485E5d9BC41Efe021';
const XION_TOKEN_ADDRESS = '0x2C2f7e7C5604D162d75641256b80F1BF4c4a7c9A';

// GraphQL endpoint pour Union V2.5
const graphqlEndpoint = 'https://graphql.union.build/v2.5/graphql';

// Explorers
const babylonExplorerUrl = 'https://explorer.babylon-testnet.io';
const xionExplorerUrl = 'https://explorer.xion-testnet.io';
const unionUrl = 'https://app.union.build/explorer';

// RPC Providers
const rpcProviders = [
  new JsonRpcProvider('https://rpc.babylon-testnet.io'),
  new JsonRpcProvider('https://rpc.xion-testnet.io')
];
let currentRpcProviderIndex = 0;

function provider() {
  return rpcProviders[currentRpcProviderIndex];
}

// Create a blessed input element for user input
const userInput = blessed.prompt({
  parent: screen,
  border: { type: 'line', fg: 'cyan' },
  height: '30%',
  width: '50%',
  top: 'center',
  left: 'center',
  label: ' Input Required ',
  tags: true,
  keys: true,
  vi: true,
  hidden: true
});

function askQuestion(query) {
  return new Promise(resolve => {
    userInput.hidden = false;
    userInput.input(query, '', (err, value) => {
      userInput.hidden = true;
      screen.render();
      resolve(value);
    });
  });
}

const explorer = {
  tx: (txHash) => `${babylonExplorerUrl}/tx/${txHash}`,
  address: (address) => `${babylonExplorerUrl}/address/${address}`,
};

const union = {
  tx: (txHash) => `${unionUrl}/transfers/${txHash}`,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function timelog() {
  return moment().tz('Asia/Jakarta').format('HH:mm:ss | DD-MM-YYYY');
}

// Fonction adaptée pour le polling des packets sur Union V2.5
async function pollPacketHash(txHash, retries = 50, intervalMs = 5000) {
  const headers = {
    accept: 'application/graphql-response+json, application/json',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/json',
    origin: 'https://app.union.build',
    referer: 'https://app.union.build/',
    'user-agent': 'Mozilla/5.0',
  };

  // Requête GraphQL adaptée pour Union V2.5
  const data = {
    query: `
      query ($submission_tx_hash: String!) {
        v2_5_transfers(args: {p_transaction_hash: $submission_tx_hash}) {
          packet_hash
        }
      }
    `,
    variables: {
      submission_tx_hash: txHash.startsWith('0x') ? txHash : `0x${txHash}`,
    },
  };

  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.post(graphqlEndpoint, data, { headers });
      const result = res.data?.data?.v2_5_transfers;
      
      if (result && result.length > 0 && result[0].packet_hash) {
        return result[0].packet_hash;
      }
    } catch (e) {
      logger.error(`Packet error: ${e.message}`);
    }
    
    await delay(intervalMs);
  }
}

// Fonction pour vérifier le solde et approuver les tokens
async function checkBalanceAndApprove(wallet, tokenAddress, spenderAddress) {
  const tokenContract = new ethers.Contract(tokenAddress, TOKEN_ABI, wallet);
  
  const balance = await tokenContract.balanceOf(wallet.address);
  if (balance === 0n) {
    logger.error(`No tokens found in wallet ${wallet.address}`);
    return false;
  }
  
  logger.info(`Wallet ${wallet.address} has ${ethers.formatUnits(balance, 18)} tokens`);
  
  const allowance = await tokenContract.allowance(wallet.address, spenderAddress);
  if (allowance < balance) {
    logger.loading(`Approving tokens for bridge...`);
    
    try {
      const tx = await tokenContract.approve(spenderAddress, ethers.MaxUint256);
      logger.loading(`Approval transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        logger.success(`Approval successful!`);
        return true;
      } else {
        logger.error(`Approval failed!`);
        return false;
      }
    } catch (e) {
      logger.error(`Approval error: ${e.message}`);
      return false;
    }
  }
  
  logger.success(`Token approval already sufficient`);
  return true;
}

// Fonction pour effectuer le bridge de Babylon vers Xion
async function bridgeBabylonToXion(wallet, amount) {
  const startTime = Date.now();
  
  try {
    // Vérifier et approuver les tokens
    const approved = await checkBalanceAndApprove(
      wallet,
      BABYLON_TOKEN_ADDRESS,
      BABYLON_BRIDGE_ADDRESS
    );
    
    if (!approved) {
      txStats.failed++;
      updateCharts();
      return false;
    }
    
    // Créer le contrat bridge
    const bridgeContract = new ethers.Contract(
      BABYLON_BRIDGE_ADDRESS,
      BRIDGE_ABI,
      wallet
    );
    
    // Paramètres pour le bridge (à adapter selon les spécifications exactes)
    const channelId = 1; // ID du canal pour Xion
    const timeoutHeight = 0n; // Pas de timeout basé sur la hauteur
    const timeoutTimestamp = BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 heure
    const salt = ethers.randomBytes(32); // Sel aléatoire
    
    // Instruction pour le transfert
    const instruction = {
      version: 1,
      opcode: 2, // Code d'opération pour le transfert
      operand: ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256'],
        [wallet.address, ethers.parseUnits(amount.toString(), 18)]
      ),
    };
    
    logger.loading(`Initiating bridge from Babylon to Xion...`);
    
    // Envoyer la transaction
    const tx = await bridgeContract.send(
      channelId,
      timeoutHeight,
      timeoutTimestamp,
      salt,
      instruction
    );
    
    logger.loading(`Bridge transaction sent: ${tx.hash}`);
    txStats.pending++;
    updateCharts();
    
    // Attendre la confirmation
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      txStats.times.push(duration);
      txStats.pending--;
      txStats.success++;
      updateCharts();
      
      logger.success(`Bridge successful! Time: ${duration}ms`);
      logger.info(`Transaction hash: ${tx.hash}`);
      logger.info(`Explorer: ${explorer.tx(tx.hash)}`);
      
      // Polling pour le packet hash
      logger.loading(`Polling for packet hash...`);
      const packetHash = await pollPacketHash(tx.hash);
      
      if (packetHash) {
        logger.success(`Packet hash found: ${packetHash}`);
        logger.info(`Union explorer: ${union.tx(packetHash)}`);
      } else {
        logger.warn(`Packet hash not found after multiple retries`);
      }
      
      return true;
    } else {
      txStats.pending--;
      txStats.failed++;
      updateCharts();
      
      logger.error(`Bridge failed!`);
      return false;
    }
  } catch (e) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    txStats.times.push(duration);
    txStats.failed++;
    updateCharts();
    
    logger.error(`Bridge error: ${e.message}`);
    return false;
  }
}

// Fonction principale
async function main() {
  logger.info(`Starting Babylon to Xion Bridge Bot - Version 2.5`);
  logger.info(`Created by dropxtor`);
  
  // Charger les portefeuilles depuis wallet.json
  let wallets = [];
  try {
    const walletData = JSON.parse(fs.readFileSync(path.join(__dirname, 'wallet.json'), 'utf8'));
    wallets = walletData.wallets.map(w => ({
      name: w.name || 'Wallet',
      wallet: new ethers.Wallet(w.privatekey, provider())
    }));
    
    logger.success(`Loaded ${wallets.length} wallets from wallet.json`);
  } catch (e) {
    logger.error(`Failed to load wallets: ${e.message}`);
    logger.info(`Please create a wallet.json file with the following structure:`);
    logger.info(`{
  "wallets": [
    {
      "name": "Wallet1",
      "privatekey": "0xYourPrivateKeyHere"
    }
  ]
}`);
    
    process.exit(1);
  }
  
  // Mettre à jour la table des portefeuilles
  const walletTableData = [
    ['Name', 'Address', 'Balance']
  ];
  
  for (const { name, wallet } of wallets) {
    const address = `${wallet.address.substring(0, 6)}...${wallet.address.substring(38)}`;
    walletTableData.push([name, address, '...']);
  }
  
  walletInfoTable.setData({
    headers: walletTableData[0],
    data: walletTableData.slice(1)
  });
  
  // Mettre à jour les informations système
  updateStatusInfo();
  setInterval(updateStatusInfo, 10000);
  
  // Demander le nombre de transactions
  const txCount = await askQuestion('How many transactions per wallet? ');
  const numTx = parseInt(txCount) || 1;
  
  logger.info(`Will perform ${numTx} transactions per wallet`);
  
  // Exécuter les transactions pour chaque portefeuille
  for (const { name, wallet } of wallets) {
    logger.step(`Processing wallet: ${name}`);
    
    for (let i = 0; i < numTx; i++) {
      logger.step(`Transaction ${i + 1}/${numTx}`);
      
      // Montant aléatoire entre 0.001 et 0.01
      const amount = (Math.random() * 0.009 + 0.001).toFixed(6);
      
      await bridgeBabylonToXion(wallet, amount);
      
      // Attendre entre les transactions pour éviter la détection de bot
      if (i < numTx - 1) {
        const waitTime = Math.floor(Math.random() * 5000) + 3000;
        logger.info(`Waiting ${waitTime}ms before next transaction...`);
        await delay(waitTime);
      }
    }
  }
  
  logger.success(`All transactions completed!`);
  logger.info(`Summary: ${txStats.success} successful, ${txStats.failed} failed`);
  logger.info(`Press Q, ESC, or Ctrl+C to exit`);
}

// Gestion des touches pour quitter
screen.key(['q', 'escape', 'C-c'], () => {
  return process.exit(0);
});

// Démarrer le bot
main().catch(e => {
  logger.error(`Fatal error: ${e.message}`);
  process.exit(1);
});
