import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-items">
        <span className="navbar-brand">ABD Hisse/ETF Vergi Takip Sistemi</span>
        <a href="/" className="nav-link">Anasayfa</a>
      </div>
    </nav>
  );
};

export default Navbar; 