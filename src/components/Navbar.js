import React from 'react';
import './Navbar.css';

const APP_VERSION = '0.2.0';

const Navbar = () => {
  return (
    <nav className="nav-items">
      <div className="nav-content">
        <div className="nav-title">
          <span>ABD Hisse/ETF Vergi Takip Sistemi</span>
          <span className="version">v{APP_VERSION}</span>
        </div>
        <div className="nav-links">
          <a href="/tax" className="nav-link">Anasayfa</a>
          <a href="/tax/faq" className="nav-link">Sıkça Sorulan Sorular</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 