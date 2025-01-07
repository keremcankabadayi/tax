import React from 'react';
import './App.css';
import TradeTable from './components/TradeTable';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>ABD Hisse/ETF Vergi Takip Sistemi</h1>
      </header>
      <main>
        <TradeTable />
      </main>
    </div>
  );
}

export default App;
