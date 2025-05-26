import React from 'react';
import { FaArrowRight } from 'react-icons/fa';
import './AssetCard.css';

// Asset icons mapping
const assetIcons = {
  BTC: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/1200px-Bitcoin.svg.png",
  ETH: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJDn0ojTITvcdAzMsfBMJaZC4STaDHzduleQ&s",
  SOL: "https://cryptologos.cc/logos/solana-sol-logo.png?v=040",
  LTC: "https://cryptologos.cc/logos/litecoin-ltc-logo.png?v=040",
  ADA: "https://cryptologos.cc/logos/cardano-ada-logo.png?v=040",
  AAPL: "https://logo.clearbit.com/apple.com",
  MSFT: "https://logo.clearbit.com/microsoft.com",
  AMZN: "https://logo.clearbit.com/amazon.com",
  GOOGL: "https://logo.clearbit.com/google.com",
};

// Fallback icon
const fallbackIcon = "https://via.placeholder.com/32";

const AssetCard = ({ asset, onClick }) => {
  const getAssetIcon = (ticker) => {
    return assetIcons[ticker] || fallbackIcon;
  };

  // Generate a simple sparkline-like chart
  const generateSparkline = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Generate random data points that trend with the price change
    const points = [];
    const numPoints = 20;
    let trend = asset.price_change_24h > 0 ? 0.1 : -0.1;
    
    for (let i = 0; i < numPoints; i++) {
      points.push(20 + Math.random() * 10 + trend * i);
    }
    
    // Draw the sparkline
    ctx.strokeStyle = asset.price_change_24h >= 0 ? '#00c853' : '#ff3d71';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const stepX = canvas.width / (numPoints - 1);
    
    for (let i = 0; i < numPoints; i++) {
      const x = i * stepX;
      const y = canvas.height - points[i];
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    return canvas.toDataURL();
  };

  return (
    <div className="asset-card" onClick={onClick}>
      <div className="asset-header">
        <img 
          src={getAssetIcon(asset.ticker)} 
          alt={asset.ticker} 
          className="asset-icon" 
          onError={(e) => { e.target.src = fallbackIcon; }}
        />
        <div>
          <div className="asset-name">
            {asset.ticker === 'BTC' ? 'Bitcoin' : 
             asset.ticker === 'ETH' ? 'Ethereum' : 
             asset.ticker === 'SOL' ? 'Solana' : 
             asset.ticker === 'LTC' ? 'Litecoin' : 
             asset.ticker === 'ADA' ? 'Cardano' : 
             asset.ticker}
          </div>
          <div className="asset-ticker">{asset.ticker}</div>
        </div>
      </div>
      
      <div className="asset-action">
        <FaArrowRight />
      </div>
      
      <div className="asset-value">
        ${asset.current_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </div>
      
      <div className={`asset-change ${asset.price_change_24h >= 0 ? '' : 'negative'}`}>
        {asset.price_change_24h >= 0 ? '+' : ''}{asset.price_change_24h.toFixed(2)}%
      </div>
      
      <div className="asset-chart">
        <img src={generateSparkline()} alt="Price chart" />
      </div>
    </div>
  );
};

export default AssetCard;