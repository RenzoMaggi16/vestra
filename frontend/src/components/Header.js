import React from 'react';
import { FaWallet, FaSearch, FaEnvelope, FaBell, FaArrowLeft } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

const Header = ({ title }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDetailPage = location.pathname.includes('/asset/');
  
  return (
    <header className="header">
      <div className="logo-container">
        {isDetailPage ? (
          <div className="back-button" onClick={() => navigate('/')}>
            <FaArrowLeft className="back-icon" />
          </div>
        ) : (
          <FaWallet className="logo-icon" />
        )}
        <h1>{title || "Dashboard"}</h1>
      </div>
      
      <div className="search-container">
        <FaSearch className="search-icon" />
        <input type="text" placeholder="Search" className="search-input" />
      </div>
      
      <div className="header-actions">
        <div className="header-action-item">
          <FaEnvelope />
        </div>
        <div className="header-action-item notification">
          <FaBell />
          <span className="notification-badge">1</span>
        </div>
        <div className="user-avatar">
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="User" />
        </div>
      </div>
    </header>
  );
};

export default Header;