import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TradeTable from './components/TradeTable';
import FAQ from './components/FAQ';

function App() {
  const temettuIstisnasi = 5250;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TradeTable temettuIstisnasi={temettuIstisnasi} />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </Layout>
  );
}

export default App;
