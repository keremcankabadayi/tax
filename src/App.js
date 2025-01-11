import React, { useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import TradeTable from './components/TradeTable';
import Navbar from './components/Navbar';

function App() {
  useEffect(() => {
    // Sayfa yüklendiğinde localStorage'dan tema tercihini al
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', savedTheme);
  }, []);

  return (
    <div className="App">
      <Navbar />
      <div className="container">
        <TradeTable />
      </div>
    </div>
  );
}

export default App;
