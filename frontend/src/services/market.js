// Market service for fetching real-time cryptocurrency and stock prices

// API keys for external services
const COIN_API_KEY = 'CG-rbJJed37tsRPzLLzLRB6L2jL'; // Reemplaza con tu clave API real
const ALPHA_VANTAGE_API_KEY = 'F68BJ1YA25QJP7J9'; // Reemplaza con tu clave API real

// Cache for prices to avoid excessive API calls
const priceCache = {
  data: {},
  timestamp: 0,
  expiryTime: 5 * 60 * 1000 // 5 minutes
};

// Helper function to determine if an asset is a cryptocurrency
const isCrypto = (ticker) => {
  const cryptoList = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'SHIB', 'AVAX', 'MATIC'];
  return cryptoList.includes(ticker);
};

// Mock data for development
const MOCK_PRICES = {
  BTC: { price: 104645, change_24h: 1.8 },
  ETH: { price: 2532, change_24h: 3.2 },
  SOL: { price: 172, change_24h: 5.7 },
  ADA: { price: 0.7623, change_24h: 2.1 },
  XRP: { price: 2.41, change_24h: 1.5 },
  AAPL: { price: 211, change_24h: -0.09 },
  MSFT: { price: 454, change_24h: 0.2 },
  AMZN: { price: 205, change_24h: 0.2 },
  GOOGL: { price: 166, change_24h: 1.3 },
  TSLA: { price: 349, change_24h: 2 },
  META: { price: 640, change_24h: -0.55 },
  NVDA: { price: 135, change_24h: 0.42 },
  JPM: { price: 152.75, change_24h: 0.3 },
  V: { price: 235.40, change_24h: 0.7 },
  WMT: { price: 59.85, change_24h: -0.2 },
  DOT: { price: 7.25, change_24h: 2.3 },
  DOGE: { price: 0.12, change_24h: 4.5 },
  SHIB: { price: 0.00002, change_24h: 3.8 },
  AVAX: { price: 35.75, change_24h: 6.2 },
  MATIC: { price: 0.85, change_24h: 1.9 }
};

const marketService = {
  // Get current prices for a list of tickers
  getPrices: async (tickers) => {
    // Check if cache is valid
    const now = Date.now();
    if (now - priceCache.timestamp < priceCache.expiryTime) {
      // Filter cached data for requested tickers
      const cachedPrices = {};
      let allCached = true;
      
      for (const ticker of tickers) {
        if (priceCache.data[ticker]) {
          cachedPrices[ticker] = priceCache.data[ticker];
        } else {
          allCached = false;
          break;
        }
      }
      
      if (allCached) {
        return cachedPrices;
      }
    }
    
    // For development, return mock data
    // Comentar o eliminar esta condición
    // if (process.env.NODE_ENV === 'development') {
    //   const mockResult = {};
    //   tickers.forEach(ticker => {
    //     mockResult[ticker] = MOCK_PRICES[ticker] || { price: 100, change_24h: 0 };
    //   });
    //   
    //   // Update cache
    //   priceCache.data = { ...priceCache.data, ...mockResult };
    //   priceCache.timestamp = now;
    //   
    //   return mockResult;
    // }
    
    // In production, fetch real data
    try {
      const cryptoTickers = tickers.filter(isCrypto);
      const stockTickers = tickers.filter(ticker => !isCrypto(ticker));
      
      const results = {};
      
      // Fetch cryptocurrency prices
      if (cryptoTickers.length > 0) {
        const cryptoData = await fetchCryptoPrices(cryptoTickers);
        Object.assign(results, cryptoData);
      }
      
      // Fetch stock prices
      if (stockTickers.length > 0) {
        const stockData = await fetchStockPrices(stockTickers);
        Object.assign(results, stockData);
      }
      
      // Update cache
      priceCache.data = { ...priceCache.data, ...results };
      priceCache.timestamp = now;
      
      return results;
    } catch (error) {
      console.error('Error fetching market prices:', error);
      throw error;
    }
  }
};

// Function to fetch cryptocurrency prices
async function fetchCryptoPrices(tickers) {
  // Using CoinAPI
  const url = `https://rest.coinapi.io/v1/assets?filter_asset_id=${tickers.join(',')}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-CoinAPI-Key': COIN_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`CoinAPI request failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the response
    const result = {};
    data.forEach(asset => {
      result[asset.asset_id] = {
        price: asset.price_usd,
        change_24h: asset.volume_1day_percent_change
      };
    });
    
    return result;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    // Devolver un objeto con una propiedad que indique que son datos simulados
    const mockResult = {};
    tickers.forEach(ticker => {
      mockResult[ticker] = {
        ...MOCK_PRICES[ticker] || { price: 0, change_24h: 0 },
        is_simulated: true
      };
    });
    return mockResult;
  }
}

// Function to fetch stock prices
async function fetchStockPrices(tickers) {
  // Using Alpha Vantage
  const result = {};
  
  // Alpha Vantage has rate limits, so we need to fetch one by one
  for (const ticker of tickers) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage request failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        const price = parseFloat(quote['05. price']);
        const previousClose = parseFloat(quote['08. previous close']);
        const change24h = previousClose > 0 ? ((price - previousClose) / previousClose) * 100 : 0;
        
        result[ticker] = {
          price,
          change_24h: change24h
        };
      }
      
      // Alpha Vantage has a rate limit, so we need to wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error fetching stock price for ${ticker}:`, error);
      // Fallback to mock data if API fails
      result[ticker] = MOCK_PRICES[ticker] || { price: 100, change_24h: 0 };
    }
  }
  
  return result;
}

export default marketService;