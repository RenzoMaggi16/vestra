import React from 'react';
import { FaEllipsisH } from 'react-icons/fa';
import './PortfolioAllocation.css';

// Asset icons mapping
const assetIcons = {
  BTC: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png",
  ETH: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJDn0ojTITvcdAzMsfBMJaZC4STaDHzduleQ&s",
  SOL: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTwCSO-UENmvWwWN33bvtut1TNz3M_OUj9--w&s",
  LTC: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=040",
  ADA: "https://cryptologos.cc/logos/cardano-ada-logo.png?v=040",
  AAPL: "https://logo.clearbit.com/apple.com",
  MSFT: "https://logo.clearbit.com/microsoft.com",
  AMZN: "https://logo.clearbit.com/amazon.com",
  GOOGL: "https://logo.clearbit.com/google.com",
  USDT: "https://cryptologos.cc/logos/tether-usdt-logo.png",
  XRP: "https://cryptologos.cc/logos/xrp-xrp-logo.png",
  META: "https://cryptologos.cc/logos/xrp-xrp-logo.png",

};

// Fallback icon
const fallbackIcon = "https://via.placeholder.com/32";

const PortfolioAllocation = ({ assets }) => {
  // Calculate percentages for each asset
  const totalValue = assets.reduce((sum, asset) => sum + asset.total_value, 0);
  
  const portfolioAssets = assets.map(asset => ({
    ...asset,
    percentage: (asset.total_value / totalValue) * 100
  })).sort((a, b) => b.percentage - a.percentage);

  const getAssetIcon = (ticker) => {
    return assetIcons[ticker] || fallbackIcon;
  };

  const getAssetName = (ticker) => {
    const names = {
      BTC: 'Bitcoin',
      ETH: 'Ethereum',
      SOL: 'Solana',
      LTC: 'Litecoin',
      ADA: 'Cardano',
      AAPL: 'Apple',
      MSFT: 'Microsoft',
      AMZN: 'Amazon',
      GOOGL: 'Google',
      USDT: 'Tether',
      XRP: 'Ripple',
      META: 'Meta',
    };
    
    return names[ticker] || ticker;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="portfolio-section">
      <div className="portfolio-header">
        <div className="portfolio-title">Mis Activos</div>
        <div className="portfolio-actions">
          <FaEllipsisH />
        </div>
      </div>
      
      {portfolioAssets.map((asset, index) => (
        <div className="portfolio-asset" key={asset.ticker}>
          <img 
            src={getAssetIcon(asset.ticker)} 
            alt={asset.ticker} 
            className="portfolio-asset-icon" 
            onError={(e) => { e.target.src = fallbackIcon; }}
          />
          
          <div className="portfolio-asset-info">
            <div className="portfolio-asset-name">{getAssetName(asset.ticker)}</div>
            <div className="portfolio-asset-ticker">{asset.ticker}</div>
          </div>
          
          <div className="portfolio-asset-allocation">
            {formatCurrency(asset.total_value)}
          </div>
          
          <div className={`portfolio-asset-change ${asset.price_change_24h >= 0 ? 'positive' : 'negative'}`}>
            {asset.price_change_24h >= 0 ? '+' : ''}{asset.price_change_24h.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
};

export default PortfolioAllocation;