const { ethers } = require('ethers');

// Enhanced RPC configuration with multiple fallbacks from chainlist.org
const RPC_URLS = {
  ethereum: [
    'https://eth.llamarpc.com',        // LlamaRPC is more reliable than drpc based on the error
    'https://ethereum.publicnode.com', // Public Node
    'https://rpc.ankr.com/eth',        // Ankr
    'https://eth.meowrpc.com',         // MeowRPC
    'https://ethereum.blockpi.network/v1/rpc/public', // BlockPI
    'https://eth.drpc.org'             // DRPC (moved to end of list since it's hitting rate limits)
  ],
  optimism: [
    'https://mainnet.optimism.io',
    'https://optimism.llamarpc.com',
    'https://optimism.meowrpc.com',
    'https://optimism.blockpi.network/v1/rpc/public'
  ],
  base: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base.publicnode.com',
    'https://base.meowrpc.com'
  ]
};

/**
 * Try all providers in the list until one works
 * @param {string} chain - Chain name (ethereum, optimism, base)
 * @returns {Promise<ethers.JsonRpcProvider>} - Working provider
 */
async function getProvider(chain) {
  if (!RPC_URLS[chain] || RPC_URLS[chain].length === 0) {
    throw new Error(`No RPC URLs configured for chain: ${chain}`);
  }
  
  // Try each provider in order until one works
  const errors = [];
  
  for (const rpcUrl of RPC_URLS[chain]) {
    try {
      console.log(`Trying RPC for ${chain}: ${rpcUrl}`);
      
      // Create provider and ensure it's initialized
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Important: Wait for the provider to be ready
      await provider.ready;
      
      // Test the provider with a simple call to verify it's working
      const blockNumber = await provider.getBlockNumber();
      console.log(`Successfully connected to ${rpcUrl}, block #${blockNumber}`);
      
      return provider;
    } catch (error) {
      console.warn(`RPC failed for ${rpcUrl}: ${error.message}`);
      errors.push({url: rpcUrl, error: error.message});
    }
  }
  
  // If we get here, all providers failed
  throw new Error(`All RPC providers failed for ${chain}: ${JSON.stringify(errors)}`);
}

module.exports = {
  getProvider,
  RPC_URLS
};
