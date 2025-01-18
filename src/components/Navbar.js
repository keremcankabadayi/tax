import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const APP_VERSION = '1.0.5';

function Navbar() {
  return (
    <nav className="nav-items">
      <div className="nav-content">
        <div className="nav-title">
          <span>ABD Hisse/ETF Vergi Takip Sistemi</span>
          <span className="version">v{APP_VERSION}</span>
        </div>
        <div className="nav-links">
          <Link to="/" className="nav-link">Anasayfa</Link>
          <Link to="/faq" className="nav-link">Sıkça Sorulan Sorular</Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 