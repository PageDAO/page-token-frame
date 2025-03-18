const { fetchPagePrices, calculateWeightedPrice } = require('./utils/tokenServices');

exports.handler = async function(event) {
  console.log('Image request received from:', event.headers['user-agent']);
  
  try {
    console.log('About to fetch PAGE prices and TVL...');
    // Fetch latest prices and TVL
    const priceData = await fetchPagePrices();
    console.log('Successfully fetched prices and TVL:', priceData);
    
    // Calculate TVL-weighted average price
    const { weightedAvgPrice, weights } = calculateWeightedPrice(priceData);
    console.log('Calculated weighted average price:', weightedAvgPrice);
    console.log('Network weights:', weights);
    
    // Format weights as percentages
    const ethereumWeight = (weights.ethereum * 100).toFixed(1);
    const optimismWeight = (weights.optimism * 100).toFixed(1);
    const baseWeight = (weights.base * 100).toFixed(1);
    const osmosisWeight = (weights.osmosis * 100).toFixed(1);
    
    // Create the SVG
    console.log('Creating SVG response');
    const svg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#1e2d3a"/>
        <text x="100" y="100" font-size="48" fill="white" font-weight="bold">$PAGE Token Prices</text>
        
        <text x="100" y="180" font-size="36" fill="#6F7CBA">Ethereum: ${priceData.ethereum.toFixed(6)} (${ethereumWeight}%)</text>
        <text x="100" y="240" font-size="36" fill="#FF0420">Optimism: ${priceData.optimism.toFixed(6)} (${optimismWeight}%)</text>
        <text x="100" y="300" font-size="36" fill="#0052FF">Base: ${priceData.base.toFixed(6)} (${baseWeight}%)</text>
        <text x="100" y="360" font-size="36" fill="#5E12A0">Osmosis: ${priceData.osmosis.toFixed(6)} (${osmosisWeight}%)</text>
        
        <text x="100" y="440" font-size="42" fill="white" font-weight="bold">TVL-Weighted Avg: ${weightedAvgPrice.toFixed(6)}</text>
        <text x="100" y="490" font-size="28" fill="#aaaaaa">*Percentages represent TVL distribution</text>
        
        <text x="100" y="580" font-size="24" fill="#aaaaaa">Last Updated: ${new Date().toLocaleString()}</text>
      </svg>
    `;
    
    console.log('Returning successful SVG response');
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: svg
    };
  } catch (error) {
    console.error('Error in image function:', error);
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Return a simple SVG error image
    const errorSvg = `
      <svg width="1200" height="628" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="628" fill="#5c1e1e"/>
        <text x="100" y="100" font-size="48" fill="white" font-weight="bold">Error Fetching $PAGE Prices</text>
        <text x="100" y="180" font-size="36" fill="white">Please try again later</text>
        <text x="100" y="240" font-size="24" fill="#dddddd">${error.message}</text>
      </svg>
    `;
    
    console.log('Returning error SVG response');
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      },
      body: errorSvg
    };
  }
};
