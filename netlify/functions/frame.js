const { fetchPagePrices, getPoolReserves, fetchOsmosisData, getV3PoolTVL, calculateWeightedPrice } = require('./utils/tokenServices');
const { PAGE_TOKEN_CONFIG } = require('./utils/tokenConfig');

// Helper function to check if user is on a chain-specific view
function isUserOnChainView(body) {
  // If we have a state parameter or previous url with "Back to Overview" button, 
  // the user is on a chain view
  return body.untrustedData?.state && 
         body.untrustedData.state.includes('chain') ||
         body.untrustedData?.url && 
         body.untrustedData.url.includes('Back%20to%20Overview');
}

// Helper function to check if this is the initial screen button press
function isInitialButtonPress(body) {
  return body.untrustedData?.url && 
         !body.untrustedData.url.includes('Back%20to%20Overview') && 
         !body.untrustedData.state;
}

// Helper function to create overview SVG with network names and TVL weighting
function createOverviewSvg(weightedPrice, prices, weights, tvls, marketCap, fdv, circulatingSupply, totalSupply) {
  // Format weights as percentages
  const ethereumWeight = (weights.ethereum * 100).toFixed(1);
  const optimismWeight = (weights.optimism * 100).toFixed(1);
  const baseWeight = (weights.base * 100).toFixed(1);
  const osmosisWeight = (weights.osmosis * 100).toFixed(1);
  
  // Format TVL values
  const ethereumTVL = `$${tvls.ethereumTVL.toLocaleString()}`;
  const optimismTVL = `$${tvls.optimismTVL.toLocaleString()}`;
  const baseTVL = `$${tvls.baseTVL.toLocaleString()}`;
  const osmosisTVL = `$${tvls.osmosisTVL.toLocaleString()}`;
  const totalTVL = (tvls.ethereumTVL + tvls.optimismTVL + tvls.baseTVL + tvls.osmosisTVL).toLocaleString();
  
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <!-- Background with simple color -->
      <rect width="1200" height="628" fill="#1e2d3a"/>
      
      <!-- Main title -->
      <text x="100" y="80" font-size="52" fill="white" font-weight="bold">$PAGE Token Metrics</text>
      
      <!-- Key metrics section -->
      <text x="100" y="150" font-size="42" fill="white">TVL-Weighted Price: $${weightedPrice.toFixed(6)}</text>
      <text x="100" y="210" font-size="36" fill="white">Market Cap: $${(marketCap).toLocaleString()}</text>
      <text x="100" y="260" font-size="36" fill="white">Fully Diluted Value: $${(fdv).toLocaleString()}</text>
      <text x="100" y="310" font-size="36" fill="white">Total TVL: $${totalTVL}</text>
      
      <!-- Supply information -->
      <text x="100" y="380" font-size="30" fill="#dddddd">Circulating Supply: ${circulatingSupply.toLocaleString()} PAGE</text>
      <text x="100" y="420" font-size="30" fill="#dddddd">Total Supply: ${totalSupply.toLocaleString()} PAGE</text>
      
      <!-- Network label box -->
      <rect x="700" y="40" width="420" height="380" rx="10" fill="#2a3f55"/>
      <text x="910" y="80" font-size="28" text-anchor="middle" fill="white" font-weight="bold">Network Distribution</text>
      
      <!-- Ethereum -->
      <text x="720" y="130" font-size="24" fill="#6F7CBA" font-weight="bold">Ethereum:</text>
      <text x="850" y="130" font-size="24" text-anchor="left" fill="#ffffff">$${prices.ethereum.toFixed(6)}</text>
      <text x="1040" y="130" font-size="24" text-anchor="right" fill="#ffffff">${ethereumWeight}%</text>
      <text x="1080" y="130" font-size="20" text-anchor="right" fill="#aaaaaa">${ethereumTVL}</text>
      
      <!-- Optimism -->
      <text x="720" y="180" font-size="24" fill="#FF0420" font-weight="bold">Optimism:</text>
      <text x="850" y="180" font-size="24" text-anchor="left" fill="#ffffff">$${prices.optimism.toFixed(6)}</text>
      <text x="1040" y="180" font-size="24" text-anchor="right" fill="#ffffff">${optimismWeight}%</text>
      <text x="1080" y="180" font-size="20" text-anchor="right" fill="#aaaaaa">${optimismTVL}</text>
      
      <!-- Base -->
      <text x="720" y="230" font-size="24" fill="#0052FF" font-weight="bold">Base:</text>
      <text x="850" y="230" font-size="24" text-anchor="left" fill="#ffffff">$${prices.base.toFixed(6)}</text>
      <text x="1040" y="230" font-size="24" text-anchor="right" fill="#ffffff">${baseWeight}%</text>
      <text x="1080" y="230" font-size="20" text-anchor="right" fill="#aaaaaa">${baseTVL}</text>
      
      <!-- Osmosis -->
      <text x="720" y="280" font-size="24" fill="#5E12A0" font-weight="bold">Osmosis:</text>
      <text x="850" y="280" font-size="24" text-anchor="left" fill="#ffffff">$${prices.osmosis.toFixed(6)}</text>
      <text x="1040" y="280" font-size="24" text-anchor="right" fill="#ffffff">${osmosisWeight}%</text>
      <text x="1080" y="280" font-size="20" text-anchor="right" fill="#aaaaaa">${osmosisTVL}</text>
      
      <!-- Legend -->
      <text x="720" y="340" font-size="20" fill="#dddddd">Price | Weight | TVL</text>
      <line x1="720" y1="350" x2="1080" y2="350" stroke="#555555" stroke-width="2"/>
      <text x="720" y="380" font-size="18" fill="#aaaaaa">*Weighted by liquidity across networks</text>
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

// Function to create chain-specific SVG
function createChainDetailSvg(chainName, price, tvl, weight, avgPrice) {
  // Get chain-specific styling
  let chainColor = "#4dabf7"; // Default blue
  let fullNetworkName = "Ethereum Mainnet";
  let poolVersion = "";
  
  if (chainName.toUpperCase() === 'ETHEREUM') {
    chainColor = "#6F7CBA";
    fullNetworkName = "Ethereum Mainnet";
    poolVersion = "v2";
  }
  else if (chainName.toUpperCase() === 'OPTIMISM') {
    chainColor = "#FF0420";
    fullNetworkName = "Optimism Mainnet";
    poolVersion = "v2";
  }
  else if (chainName.toUpperCase() === 'BASE') {
    chainColor = "#0052FF";
    fullNetworkName = "Base Mainnet";
    poolVersion = "v3";
  }
  else if (chainName.toUpperCase() === 'OSMOSIS') {
    chainColor = "#5E12A0";
    fullNetworkName = "Osmosis Mainnet";
  }

  // Format weight as percentage
  const weightPercent = (weight * 100).toFixed(1);
  
  // Calculate price premium/discount compared to weighted average
  const priceDiff = ((price / avgPrice) - 1) * 100;
  const priceCompareText = priceDiff >= 0 
    ? `+${priceDiff.toFixed(1)}% vs weighted avg`
    : `${priceDiff.toFixed(1)}% vs weighted avg`;
  
  // Add pool version display if it exists
  const versionText = poolVersion ? ` (${poolVersion})` : '';

  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="1200" height="628" fill="#1e2d3a"/>
      
      <!-- Title -->
      <text x="100" y="120" font-size="64" fill="white" font-weight="bold">$PAGE on ${chainName}</text>
      
      <!-- Network Name -->
      <rect x="800" y="40" width="320" height="80" rx="10" fill="${chainColor}"/>
      <text x="960" y="90" font-size="28" text-anchor="middle" fill="white" font-weight="bold">${fullNetworkName}${versionText}</text>
      
      <!-- Price -->
      <text x="100" y="220" font-size="54" fill="white">Price: <tspan font-weight="bold" fill="${chainColor}">$${price.toFixed(6)}</tspan></text>
      <text x="100" y="260" font-size="24" fill="#aaaaaa">${priceCompareText}</text>
      
      <!-- TVL -->
      <text x="100" y="320" font-size="54" fill="white">TVL: <tspan font-weight="bold" fill="${chainColor}">${tvl}</tspan></text>
      
      <!-- Weight -->
      <text x="100" y="380" font-size="42" fill="white">Weight: <tspan font-weight="bold" fill="${chainColor}">${weightPercent}%</tspan></text>
      <text x="100" y="420" font-size="24" fill="#aaaaaa">of total liquidity across all networks</text>
      
      <!-- Pool Info (for v3) -->
      ${poolVersion === 'v3' ? `
      <rect x="100" y="470" width="500" height="80" rx="10" fill="#233240"/>
      <text x="120" y="520" font-size="28" fill="#dddddd">Pool ID: <tspan font-weight="bold" fill="#dddddd">2376403</tspan></text>
      ` : ''}
      
      <!-- Footer with timestamp -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

// Error SVG with improved visuals
function createErrorSvg(errorMessage) {
  return `
    <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="628" fill="#5c1e1e"/>
      <text x="100" y="120" font-size="64" fill="white" font-weight="bold">Error Fetching $PAGE Prices</text>
      <text x="100" y="220" font-size="48" fill="#eeeeee">Please try again later</text>
      <text x="100" y="320" font-size="32" fill="#dddddd">${errorMessage || 'Connection error'}</text>
      
      <!-- Warning icon -->
      <circle cx="1000" cy="120" r="70" fill="#5c1e1e" stroke="#ff6b6b" stroke-width="3"/>
      <text x="1000" y="140" font-size="80" text-anchor="middle" fill="#ff6b6b">!</text>
      
      <!-- Footer -->
      <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
    </svg>
  `;
}

exports.handler = async function(event) {
  try {
    // Check if this is initial load or button interaction
    const isPost = event.httpMethod === 'POST';
    let buttonPressed = null;
    
    // Site base URL
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    // Default image (IPFS-hosted static image)
    let imageUrl = "https://ipfs.io/ipfs/bafkreidxiyur3tvwkcnr22t2ch55mstgmg7bvtr5meu6bmdpoapan6ktwy";
    
    // Circulation and total supply
    const CIRCULATING_SUPPLY = 42500000;
    const TOTAL_SUPPLY = 100000000;
    
    // Parse POST data if this is a button interaction
    if (isPost && event.body) {
      try {
        const body = JSON.parse(event.body);
        buttonPressed = body.untrustedData?.buttonIndex;
        console.log("Button pressed:", buttonPressed);
        
        // Fetch latest prices and TVL for all calculations
        const priceData = await fetchPagePrices();
        console.log("Fetched prices and TVL:", priceData);
        
        // Calculate TVL-weighted average price
        const { weightedAvgPrice, weights } = calculateWeightedPrice(priceData);
        console.log("Calculated weighted average price:", weightedAvgPrice);
        console.log("Network weights:", weights);
        
        // Calculate market cap and FDV based on weighted average price
        const marketCap = weightedAvgPrice * CIRCULATING_SUPPLY;
        const fdv = weightedAvgPrice * TOTAL_SUPPLY;
        
        // Handle "Back to Overview" button from a chain-specific view
        if (buttonPressed === 1 && isUserOnChainView(body)) {
          // User pressed "Back to Overview" when viewing a chain
          const svg = createOverviewSvg(
            weightedAvgPrice, 
            {
              ethereum: priceData.ethereum,
              optimism: priceData.optimism,
              base: priceData.base,
              osmosis: priceData.osmosis
            },
            weights,
            {
              ethereumTVL: priceData.ethereumTVL,
              optimismTVL: priceData.optimismTVL,
              baseTVL: priceData.baseTVL,
              osmosisTVL: priceData.osmosisTVL
            }, 
            marketCap, 
            fdv, 
            CIRCULATING_SUPPLY, 
            TOTAL_SUPPLY
          );
          
          const svgBase64 = Buffer.from(svg).toString('base64');
          imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
          
          return {
            statusCode: 200,
            headers: {"Content-Type": "text/html"},
            body: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${imageUrl}" />
              <meta property="fc:frame:button:1" content="Ethereum" />
              <meta property="fc:frame:button:2" content="Optimism" />
              <meta property="fc:frame:button:3" content="Base" />
              <meta property="fc:frame:button:4" content="Osmosis" />
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <meta property="fc:frame:state" content="overview" />
              <title>PAGE Token Metrics</title>
            </head>
            <body></body>
            </html>
            `
          };
        }
        
        // Handle initial "Show Prices" button press
        else if (buttonPressed === 1 && isInitialButtonPress(body)) {
          const svg = createOverviewSvg(
            weightedAvgPrice, 
            {
              ethereum: priceData.ethereum,
              optimism: priceData.optimism,
              base: priceData.base,
              osmosis: priceData.osmosis
            },
            weights,
            {
              ethereumTVL: priceData.ethereumTVL,
              optimismTVL: priceData.optimismTVL,
              baseTVL: priceData.baseTVL,
              osmosisTVL: priceData.osmosisTVL
            }, 
            marketCap, 
            fdv, 
            CIRCULATING_SUPPLY, 
            TOTAL_SUPPLY
          );
          
          // Encode SVG to data URI
          const svgBase64 = Buffer.from(svg).toString('base64');
          imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
          
          return {
            statusCode: 200,
            headers: {"Content-Type": "text/html"},
            body: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta property="fc:frame" content="vNext" />
              <meta property="fc:frame:image" content="${imageUrl}" />
              <meta property="fc:frame:button:1" content="Ethereum" />
              <meta property="fc:frame:button:2" content="Optimism" />
              <meta property="fc:frame:button:3" content="Base" />
              <meta property="fc:frame:button:4" content="Osmosis" />
              <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
              <meta property="fc:frame:state" content="overview" />
              <title>PAGE Token Metrics</title>
            </head>
            <body></body>
            </html>
            `
          };
        }
        
        // Handle chain-specific button presses from the overview screen
        else if ([1, 2, 3, 4].includes(buttonPressed) && !isUserOnChainView(body)) {
          let chain = "ethereum";
          let price = 0;
          let dexUrl = "";
          let chainName = "";
          let weight = 0.25; // Default weight
          
          switch(buttonPressed) {
            case 1: // Ethereum
              chain = "ethereum";
              price = priceData.ethereum;
              chainName = "Ethereum";
              weight = weights.ethereum;
              dexUrl = PAGE_TOKEN_CONFIG[0].dexUrl;
              break;
            case 2: // Optimism
              chain = "optimism";
              price = priceData.optimism;
              chainName = "Optimism";
              weight = weights.optimism;
              dexUrl = PAGE_TOKEN_CONFIG[1].dexUrl;
              break;
            case 3: // Base
              chain = "base";
              price = priceData.base;
              chainName = "Base";
              weight = weights.base;
              dexUrl = PAGE_TOKEN_CONFIG[2].dexUrl;
              break;
            case 4: // Osmosis
              chain = "osmosis";
              price = priceData.osmosis;
              chainName = "Osmosis";
              weight = weights.osmosis;
              dexUrl = "https://app.osmosis.zone/?from=USDC&to=PAGE";
              break;
          }
          
          // Get TVL for this chain
          let tvl = "N/A";
          try {
            if (chain === "osmosis" && typeof priceData.osmosisTVL === 'number') {
              tvl = `$${priceData.osmosisTVL.toLocaleString()}`;
            } else if (chain === "ethereum" && typeof priceData.ethereumTVL === 'number') {
              tvl = `$${priceData.ethereumTVL.toLocaleString()}`;
            } else if (chain === "optimism" && typeof priceData.optimismTVL === 'number') {
              tvl = `$${priceData.optimismTVL.toLocaleString()}`;
            } else if (chain === "base" && typeof priceData.baseTVL === 'number') {
              tvl = `$${priceData.baseTVL.toLocaleString()}`;
            } else {
              console.log(`No TVL data for ${chain}, using fallback calculation`);
              // Fallback to calculate TVL if missing in the cached data
              if (chain === "osmosis") {
                const osmosisData = await fetchOsmosisData();
                tvl = `$${osmosisData.tvl.toLocaleString()}`;
              } else {
                // For EVM chains, use the token config to fetch TVL if needed
                const tokenConfig = PAGE_TOKEN_CONFIG.find(config => 
                  (chain === "ethereum" && config.chainId === 1) ||
                  (chain === "optimism" && config.chainId === 10) ||
                  (chain === "base" && config.chainId === 8453)
                );
                
                if (tokenConfig) {
                  if (chain === "base") {
                    const totalTVL = await getV3PoolTVL(
                      tokenConfig.lpAddress,
                      tokenConfig,
                      chain,
                      price,
                      priceData.ethPrice
                    );
                    tvl = `$${totalTVL.toLocaleString()}`;
                  } else {
                    const reserves = await getPoolReserves(tokenConfig.lpAddress, tokenConfig, chain);
                    const pageValueInPool = reserves.tokenAAmount * price;
                    const ethValue = reserves.tokenBAmount * priceData.ethPrice;
                    tvl = `$${(pageValueInPool + ethValue).toLocaleString()}`;
                  }
                }
              }
            }
          } catch (error) {
            console.error(`Error getting TVL for ${chain}:`, error);
            tvl = "Error calculating TVL";
          }
          
          // Use the enhanced chain detail SVG with weight information
          const svg = createChainDetailSvg(chainName, price, tvl, weight, weightedAvgPrice);
          
          // Encode SVG to data URI
          const svgBase64 = Buffer.from(svg).toString('base64');
          imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
          
          // Modified to include a special Rebase button for Base chain
          if (chain === "base") {
            return {
              statusCode: 200,
              headers: {"Content-Type": "text/html"},
              body: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="fc:frame:button:1" content="Back to Overview" />
                <meta property="fc:frame:button:2" content="Trade on ${chainName}" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="${dexUrl}" />
                <meta property="fc:frame:button:3" content="View on Rebase" />
                <meta property="fc:frame:button:3:action" content="link" />
                <meta property="fc:frame:button:3:target" content="https://www.rebase.finance/0xc4730f86d1F86cE0712a7b17EE919Db7dEFad7FE" />
                <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
                <meta property="fc:frame:state" content="chain_${chain}" />
                <title>PAGE Token on ${chainName}</title>
              </head>
              <body></body>
              </html>
              `
            };
          } else {
            // Standard return for other chains
            return {
              statusCode: 200,
              headers: {"Content-Type": "text/html"},
              body: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta property="fc:frame" content="vNext" />
                <meta property="fc:frame:image" content="${imageUrl}" />
                <meta property="fc:frame:button:1" content="Back to Overview" />
                <meta property="fc:frame:button:2" content="Trade on ${chainName}" />
                <meta property="fc:frame:button:2:action" content="link" />
                <meta property="fc:frame:button:2:target" content="${dexUrl}" />
                <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
                <meta property="fc:frame:state" content="chain_${chain}" />
                <title>PAGE Token on ${chainName}</title>
              </head>
              <body></body>
              </html>
              `
            };
          }
        }
      } catch (error) {
        console.error('Error processing button press:', error);
        // Generate error SVG for button press errors
        const svg = createErrorSvg(error.message);
        
        // Encode SVG to data URI
        const svgBase64 = Buffer.from(svg).toString('base64');
        imageUrl = `data:image/svg+xml;base64,${svgBase64}`;
      }
    }
    
    // Initial frame or error recovery - with the three original buttons
    return {
      statusCode: 200,
      headers: {"Content-Type": "text/html"},
      body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${imageUrl}" />
        <meta property="fc:frame:button:1" content="Show Prices" />
        <meta property="fc:frame:button:2" content="Visit PageDAO.org" />
        <meta property="fc:frame:button:3" content="Join PAGE Channel" />
        <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
        <meta property="fc:frame:button:2:action" content="link" />
        <meta property="fc:frame:button:2:target" content="https://pagedao.org" />
        <meta property="fc:frame:button:3:action" content="link" />
        <meta property="fc:frame:button:3:target" content="https://warpcast.com/~/channel/page" />
        <title>PAGE Token Metrics</title>
      </head>
      <body></body>
      </html>
      `
    };
  } catch (error) {
    console.error('Unhandled error in frame handler:', error);
    
    // Generate error SVG for catastrophic errors
    const errorSvg = createErrorSvg("Service Temporarily Unavailable");
    
    // Get host for error recovery
    const host = process.env.URL || 'https://pagetokenprices.netlify.app';
    
    // Encode SVG to data URI
    const svgBase64 = Buffer.from(errorSvg).toString('base64');
    const errorImageUrl = `data:image/svg+xml;base64,${svgBase64}`;
    
    return {
      statusCode: 200, // Still return 200 to show the error frame
      headers: {"Content-Type": "text/html"},
      body: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="${errorImageUrl}" />
        <meta property="fc:frame:button:1" content="Try Again" />
        <meta property="fc:frame:post_url" content="${host}/.netlify/functions/frame" />
        <title>PAGE Token Metrics Error</title>
      </head>
      <body></body>
      </html>
      `
    };
  }
}
