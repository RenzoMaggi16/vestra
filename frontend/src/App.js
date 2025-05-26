import React, { useState, useEffect } from 'react';
import { FaHome, FaUser, FaChartLine, FaWallet, FaNewspaper, FaCog, FaSignOutAlt, FaArrowUp, FaArrowDown, FaPlus } from 'react-icons/fa';
import Header from './components/Header';
import AssetCard from './components/AssetCard';
import PortfolioAllocation from './components/PortfolioAllocation';
import Chart from './components/Chart';
import TransactionModal from './components/TransactionModal';
import './App.css';
import apiService from './services/api';
import marketService from './services/market';

function App() {
  const [portfolioSummary, setPortfolioSummary] = useState({
    total_value: 0,
    daily_change_percent: 0,
    assets: []
  });
  
  const [portfolioHistory, setPortfolioHistory] = useState({
    dates: [],
    values: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [timeFilter, setTimeFilter] = useState('1d');
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      
      // Get user transactions
      const transactions = await apiService.getTransactions();
      
      // Get current market prices for all assets in the portfolio
      const tickers = [...new Set(transactions.map(t => t.ticker))];
      const marketPrices = await marketService.getPrices(tickers);
      
      // Calculate portfolio value based on transactions and current prices
      let assets = [];
      let totalValue = 0;
      let totalPreviousValue = 0;
      
      // Group transactions by ticker
      const assetMap = {};
      
      transactions.forEach(transaction => {
        const { ticker, quantity } = transaction;
        
        if (!assetMap[ticker]) {
          assetMap[ticker] = {
            ticker,
            quantity: 0,
            total_value: 0,
            current_price: marketPrices[ticker]?.price || 0,
            price_change_24h: marketPrices[ticker]?.change_24h || 0
          };
        }
        
        assetMap[ticker].quantity += quantity;
      });
      
      // Calculate values for each asset
      for (const ticker in assetMap) {
        const asset = assetMap[ticker];
        asset.total_value = asset.quantity * asset.current_price;
        
        // Only include assets with positive quantity (user still owns them)
        if (asset.quantity > 0) {
          assets.push(asset);
          totalValue += asset.total_value;
          totalPreviousValue += asset.total_value / (1 + asset.price_change_24h / 100);
        }
      }
      
      // Calculate daily change percentage
      const dailyChangePercent = totalPreviousValue > 0 
        ? ((totalValue - totalPreviousValue) / totalPreviousValue) * 100 
        : 0;
      
      // Update portfolio summary
      const summary = {
        total_value: totalValue,
        daily_change_percent: dailyChangePercent,
        assets: assets
      };
      
      setPortfolioSummary(summary);
      
      // Get portfolio history
      const history = await apiService.getPortfolioHistory(30);
      setPortfolioHistory(history);
      
      // Set the first asset as selected by default if available
      if (assets.length > 0 && !selectedAsset) {
        setSelectedAsset(assets[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      setError('Failed to load portfolio data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPortfolioData();

    // Set up interval for periodic updates
    const intervalId = setInterval(fetchPortfolioData, 60000); // Update every minute

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedAsset]);

  const formatCurrency = (value) => {
    const [whole, decimal] = value.toFixed(2).split('.');
    return (
      <>
        ${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}<span className="decimal">.{decimal}</span>
      </>
    );
  };

  const handleTransactionAdded = () => {
    // Refresh portfolio data after adding a transaction
    fetchPortfolioData();
  };

  return (
    <div className="app">
      <Header />
      
      <div className="main-content">
        <div className="sidebar">
          <div className="sidebar-item active">
            <span className="sidebar-item-icon"><FaHome /></span>
            Dashboard
          </div>
          <div className="sidebar-item">
            <span className="sidebar-item-icon"><FaUser /></span>
            Account
          </div>
          <div className="sidebar-item">
            <span className="sidebar-item-icon"><FaChartLine /></span>
            Chart
          </div>
          <div className="sidebar-item">
            <span className="sidebar-item-icon"><FaWallet /></span>
            Wallet
          </div>
          <div className="sidebar-item">
            <span className="sidebar-item-icon"><FaNewspaper /></span>
            News
          </div>
          <div className="sidebar-item">
            <span className="sidebar-item-icon"><FaCog /></span>
            Settings
          </div>
          
          <div style={{ marginTop: 'auto' }} className="sidebar-item">
            <span className="sidebar-item-icon"><FaSignOutAlt /></span>
            Log out
          </div>
        </div>
        
        <div className="dashboard-content">
          {loading && <div className="loading">Loading portfolio data...</div>}
          
          {error && <div className="error-message">{error}</div>}
          
          {!loading && !error && (
            <>
              <div className="total-balance">
                <div className="balance-label">TOTAL BALANCE</div>
                <div className="balance-amount">
                  {formatCurrency(portfolioSummary.total_value)}
                  </div>

                  {portfolioSummary.total_value > 0 ? (
                    <div className="time-periods">
                    <div className="time-period">
                      <div className="time-period-label">Today</div>
                      <div className={`time-period-value ${portfolioSummary.daily_change_percent >= 0 ? 'positive' : 'negative'}`}>
                        {portfolioSummary.daily_change_percent >= 0 ? '+' : ''}
                        {portfolioSummary.daily_change_percent.toFixed(1)}%
                        {portfolioSummary.daily_change_percent >= 0 ? <FaArrowUp size={12} style={{ marginLeft: '4px' }} /> : <FaArrowDown size={12} style={{ marginLeft: '4px' }} />}
                      </div>
                    </div>
                    <div className="time-period">
                      <div className="time-period-label">7 Days</div>
                      <div className="time-period-value positive">
                        +4.25%
                        <FaArrowUp size={12} style={{ marginLeft: '4px' }} />
                      </div>
                    </div>
                    <div className="time-period">
                      <div className="time-period-label">30 Days</div>
                      <div className="time-period-value positive">
                        +11.5%
                        <FaArrowUp size={12} style={{ marginLeft: '4px' }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-portfolio-message">
                    Add assets to start tracking your portfolio
                  </div>
                )}
              </div>
              
              <div className="asset-cards">
                {portfolioSummary.assets.length > 0 ? (
                  portfolioSummary.assets.map(asset => (
                    <AssetCard 
                      key={asset.ticker}
                      asset={asset}
                      onClick={() => setSelectedAsset(asset)}
                    />
                  ))
                ) : (
                  <div className="empty-assets-message">
                    No assets in your portfolio yet. Click the + button to add your first asset.
                  </div>
                )}
              </div>
              
              <div className="dashboard-sections">
                {portfolioSummary.assets.length > 0 ? (
                  <>
                    <PortfolioAllocation assets={portfolioSummary.assets} />
                    
                    <div className="chart-section">
                      <div className="chart-header">
                        <div className="chart-title">
                          Chart
                        </div>
                        <div className="chart-selector">
                          <div className="chart-selector-item">USD</div>
                        </div>
                      </div>
                      
                      {selectedAsset && (
                        <div className="chart-price">
                          ${selectedAsset.current_price.toFixed(2)}
                        </div>
                      )}
                      
                      <div className="chart-container">
                        <Chart 
                          data={portfolioHistory}
                          selectedAsset={selectedAsset}
                          timeFilter={timeFilter}
                        />
                      </div>
                      
                      <div className="chart-time-filters">
                        <div 
                          className={`chart-time-filter ${timeFilter === '1h' ? 'active' : ''}`}
                          onClick={() => setTimeFilter('1h')}
                        >
                          1h
                        </div>
                        <div 
                          className={`chart-time-filter ${timeFilter === '3h' ? 'active' : ''}`}
                          onClick={() => setTimeFilter('3h')}
                        >
                          3h
                        </div>
                        <div 
                          className={`chart-time-filter ${timeFilter === '1d' ? 'active' : ''}`}
                          onClick={() => setTimeFilter('1d')}
                        >
                          1d
                        </div>
                        <div 
                          className={`chart-time-filter ${timeFilter === '1w' ? 'active' : ''}`}
                          onClick={() => setTimeFilter('1w')}
                        >
                          1w
                        </div>
                        <div 
                          className={`chart-time-filter ${timeFilter === '1m' ? 'active' : ''}`}
                          onClick={() => setTimeFilter('1m')}
                        >
                          1m
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-dashboard-message">
                    Your portfolio is empty. Add assets to see allocation and charts.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      <div 
        className="add-transaction-button"
        onClick={() => setShowTransactionModal(true)}
      >
        <FaPlus />
      </div>
      
      {showTransactionModal && (
        <TransactionModal 
          onClose={() => setShowTransactionModal(false)}
          onTransactionAdded={handleTransactionAdded}
        />
      )}
    </div>
  );
}

export default App;