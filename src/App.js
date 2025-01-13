import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TradeTable from './components/TradeTable';
import FAQ from './components/FAQ';
import Layout from './components/Layout';
import DisclaimerModal from './components/DisclaimerModal';
import './App.css';

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const temettuIstisnasi = 5250;

  useEffect(() => {
    const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');
    if (!disclaimerAccepted) {
      setShowDisclaimer(true);
    }
  }, []);

  const handleAcceptDisclaimer = () => {
    setShowDisclaimer(false);
  };

  const handleDeclineDisclaimer = () => {
    // Kullanıcı kabul etmediğinde ana sayfaya yönlendir
    window.location.href = 'https://www.gib.gov.tr';
  };

  return (
    <Layout>
      <DisclaimerModal
        isOpen={showDisclaimer}
        onAccept={handleAcceptDisclaimer}
        onDecline={handleDeclineDisclaimer}
      />
      <Routes>
        <Route path="/" element={<TradeTable temettuIstisnasi={temettuIstisnasi} />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </Layout>
  );
}

export default App;
