import React, { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const Navbar = ({ temettuIstisnasi, setTemettuIstisnasi }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const hamburgerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Dropdown menü için kontrol
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      
      // Hamburger menü için kontrol
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTemettuChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setTemettuIstisnasi(value);
  };

  return (
    <nav className="navbar">
      <div 
        ref={hamburgerRef}
        className="hamburger" 
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </div>

      <div className={`nav-items ${isMenuOpen ? 'open' : ''}`}>
        <div className="nav-item">
          <a href="/" className="nav-link">Anasayfa</a>
        </div>
        <div className="nav-item dropdown" ref={dropdownRef}>
          <button 
            className="nav-link dropdown-toggle"
            onClick={() => setIsDropdownOpen(!isMenuOpen)}
          >
            Vergi Dilimleri
          </button>
          {isDropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item">
                <label htmlFor="temettu-istisnasi">Temettü İstisnası (₺)</label>
                <input
                  id="temettu-istisnasi"
                  type="text"
                  value={temettuIstisnasi}
                  onChange={handleTemettuChange}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 