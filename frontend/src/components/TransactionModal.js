import React, { useState, useEffect } from 'react';
import { FaTimes, FaSearch } from 'react-icons/fa';
import './TransactionModal.css';
import apiService from '../services/api';
import marketService from '../services/market';

const popularAssets = {
  crypto: ['BTC', 'ETH', 'SOL', 'ADA', 'XRP', 'DOT', 'DOGE', 'SHIB', 'AVAX', 'MATIC'],
  stock: ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'JPM', 'V', 'WMT']
};

const TransactionModal = ({ onClose, onTransactionAdded }) => {
  const [formData, setFormData] = useState({
    asset_type: 'crypto',
    ticker: '',
    price: '',
    quantity: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({});
  const [transactionType, setTransactionType] = useState('buy'); // 'buy' or 'sell'

  // Fetch current prices for popular assets
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const assets = [...popularAssets.crypto, ...popularAssets.stock];
        const prices = await marketService.getPrices(assets);
        setCurrentPrices(prices);
      } catch (error) {
        console.error('Error fetching prices:', error);
      }
    };
    
    fetchPrices();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'asset_type') {
      // Reset ticker when changing asset type
      setFormData({
        ...formData,
        [name]: value,
        ticker: ''
      });
      
      // Show popular assets for the selected type
      setSearchResults(popularAssets[value].map(ticker => ({
        ticker,
        price: currentPrices[ticker]?.price || 0,
        change_24h: currentPrices[ticker]?.change_24h || 0
      })));
    } else if (name === 'ticker') {
      setFormData({
        ...formData,
        [name]: value.toUpperCase()
      });
      
      // Search for assets matching the input
      if (value.length > 0) {
        const results = popularAssets[formData.asset_type]
          .filter(ticker => ticker.toUpperCase().includes(value.toUpperCase()))
          .map(ticker => ({
            ticker,
            price: currentPrices[ticker]?.price || 0,
            change_24h: currentPrices[ticker]?.change_24h || 0
          }));
        
        setSearchResults(results);
      } else {
        setSearchResults(popularAssets[formData.asset_type].map(ticker => ({
          ticker,
          price: currentPrices[ticker]?.price || 0,
          change_24h: currentPrices[ticker]?.change_24h || 0
        })));
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const selectAsset = (ticker, price) => {
    setFormData({
      ...formData,
      ticker,
      price: price.toString()
    });
    setSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.ticker || !formData.price || !formData.quantity) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Convert price and quantity to numbers
      const transactionData = {
        ...formData,
        ticker: formData.ticker.toUpperCase(),
        price: parseFloat(formData.price),
        quantity: transactionType === 'buy' 
          ? Math.abs(parseFloat(formData.quantity)) 
          : -Math.abs(parseFloat(formData.quantity))
      };
      
      // Add transaction via API
      await apiService.addTransaction(transactionData);
      
      // Notify parent component
      onTransactionAdded();
      
      // Close modal
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError('Failed to add transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Add Transaction</div>
          <div className="modal-close" onClick={onClose}>
            <FaTimes />
          </div>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="transaction-type-selector">
            <button 
              type="button"
              className={`transaction-type-btn ${transactionType === 'buy' ? 'active' : ''}`}
              onClick={() => setTransactionType('buy')}
            >
              Buy
            </button>
            <button 
              type="button"
              className={`transaction-type-btn ${transactionType === 'sell' ? 'active' : ''}`}
              onClick={() => setTransactionType('sell')}
            >
              Sell
            </button>
          </div>
          
          <div className="form-group">
            <label className="form-label">Asset Type</label>
            <select 
              name="asset_type" 
              className="form-select"
              value={formData.asset_type}
              onChange={handleChange}
            >
              <option value="crypto">Cryptocurrency</option>
              <option value="stock">Stock</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">Asset</label>
            <div className="search-input-container">
              <FaSearch className="search-icon" />
              <input 
                type="text" 
                name="ticker" 
                className="form-control"
                placeholder={`Search ${formData.asset_type === 'crypto' ? 'cryptocurrencies' : 'stocks'}`}
                value={formData.ticker}
                onChange={handleChange}
              />
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(result => (
                  <div 
                    key={result.ticker} 
                    className="search-result-item"
                    onClick={() => selectAsset(result.ticker, result.price)}
                  >
                    <div className="search-result-ticker">{result.ticker}</div>
                    <div className="search-result-price">${result.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={`search-result-change ${result.change_24h >= 0 ? 'positive' : 'negative'}`}>
                      {result.change_24h >= 0 ? '+' : ''}{result.change_24h.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">Price per Unit (USD)</label>
            <input 
              type="number" 
              name="price" 
              className="form-control"
              placeholder="e.g. 50000"
              value={formData.price}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input 
              type="number" 
              name="quantity" 
              className="form-control"
              placeholder="e.g. 0.5"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              step="0.000001"
            />
          </div>
          
          <div className="transaction-summary">
            <div className="transaction-summary-label">Total Value:</div>
            <div className="transaction-summary-value">
              ${(parseFloat(formData.price || 0) * parseFloat(formData.quantity || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Processing...' : `${transactionType === 'buy' ? 'Buy' : 'Sell'} ${formData.ticker || 'Asset'}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;