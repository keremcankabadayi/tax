import React, { useState } from 'react';
import './App.css';
import TradeTable from './components/TradeTable';
import Navbar from './components/Navbar';

function App() {
  const [temettuIstisnasi, setTemettuIstisnasi] = useState(0);

  return (
    <div className="App">
      <Navbar 
        temettuIstisnasi={temettuIstisnasi}
        setTemettuIstisnasi={setTemettuIstisnasi}
      />
      <main>
        <TradeTable />
      </main>
    </div>
  );
}

export default App;
