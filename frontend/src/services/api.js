// API service for communicating with the backend

const API_BASE_URL = 'http://localhost:8000';

// Mock data for development
const MOCK_DATA = {
  portfolio_summary: {
    total_value: 24680.75,
    daily_change_percent: 2.34,
    assets: [
      {
        ticker: 'BTC',
        current_price: 37500,
        total_value: 9375,
        quantity: 0.25,
        price_change_24h: 1.8
      },
      {
        ticker: 'ETH',
        current_price: 2800,
        total_value: 5600,
        quantity: 2,
        price_change_24h: 3.2
      },
      {
        ticker: 'SOL',
        current_price: 105,
        total_value: 2100,
        quantity: 20,
        price_change_24h: 5.7
      },
      {
        ticker: 'AAPL',
        current_price: 180.5,
        total_value: 3610,
        quantity: 20,
        price_change_24h: -0.8
      },
      {
        ticker: 'MSFT',
        current_price: 399.25,
        total_value: 3992.5,
        quantity: 10,
        price_change_24h: 1.2
      }
    ]
  },
  portfolio_history: {
    dates: Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    }),
    values: Array.from({ length: 30 }, (_, i) => {
      // Start at 20000 and end at 24680.75 with some randomness
      const trend = 20000 + (i / 29) * 4680.75;
      return trend + (Math.random() * 1000 - 500);
    })
  }
};

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API request failed');
  }
  return response.json();
};

// Mock transactions data for development
const MOCK_TRANSACTIONS = [
  {
    id: 1,
    ticker: 'BTC',
    quantity: 0.25,
    price: 35000,
    timestamp: new Date('2023-01-15').getTime()
  },
  {
    id: 2,
    ticker: 'ETH',
    quantity: 2,
    price: 2500,
    timestamp: new Date('2023-02-10').getTime()
  },
  {
    id: 3,
    ticker: 'SOL',
    quantity: 20,
    price: 90,
    timestamp: new Date('2023-03-05').getTime()
  },
  {
    id: 4,
    ticker: 'AAPL',
    quantity: 20,
    price: 175,
    timestamp: new Date('2023-02-20').getTime()
  },
  {
    id: 5,
    ticker: 'MSFT',
    quantity: 10,
    price: 380,
    timestamp: new Date('2023-03-15').getTime()
  }
];

// API service methods
const apiService = {
  // Get portfolio summary
  getPortfolioSummary: async () => {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_DATA.portfolio_summary), 500);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/portfolio/summary`);
    return handleResponse(response);
  },
  
  // Get portfolio history
  getPortfolioHistory: async (days = 30) => {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_DATA.portfolio_history), 500);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/portfolio/history?days=${days}`);
    return handleResponse(response);
  },
  
  // Get portfolio allocation
  getPortfolioAllocation: async () => {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      return new Promise(resolve => {
        setTimeout(() => resolve(MOCK_DATA.portfolio_summary.assets), 500);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/portfolio/allocation`);
    return handleResponse(response);
  },
  
  // Get all user transactions
  getTransactions: async () => {
    // For development, return mock data
    if (process.env.NODE_ENV === 'development') {
      // Get transactions from localStorage or use mock data if none exist
      const storedTransactions = localStorage.getItem('transactions');
      const transactions = storedTransactions ? JSON.parse(storedTransactions) : [...MOCK_TRANSACTIONS];
      
      return new Promise(resolve => {
        setTimeout(() => resolve(transactions), 500);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return handleResponse(response);
  },
  
  // Add a new transaction
  addTransaction: async (transactionData) => {
    // For development, just log and return success
    if (process.env.NODE_ENV === 'development') {
      console.log('Adding transaction:', transactionData);
      
      // Get existing transactions from localStorage or use mock data
      const storedTransactions = localStorage.getItem('transactions');
      const transactions = storedTransactions ? JSON.parse(storedTransactions) : [...MOCK_TRANSACTIONS];
      
      // Add to transactions
      const newTransaction = {
        id: transactions.length + 1,
        ...transactionData,
        timestamp: Date.now()
      };
      
      transactions.push(newTransaction);
      
      // Save back to localStorage
      localStorage.setItem('transactions', JSON.stringify(transactions));
      
      return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, transaction: newTransaction }), 500);
      });
    }
    
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transactionData)
    });
    
    return handleResponse(response);
  }
};

export default apiService;