import React, { useState, useEffect, useRef } from 'react';
import './TaxCalculation.css';

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';

const TaxCalculation = ({ trades, profitLoss }) => {
  const [taxBrackets, setTaxBrackets] = useState(null);
  const [showTaxTooltip, setShowTaxTooltip] = useState(false);
  const [showDividendTooltip, setShowDividendTooltip] = useState(false);
  const iconRef = useRef(null);

  useEffect(() => {
    const fetchTaxBrackets = async () => {
      try {
        const response = await fetch(`https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/tax_brackets`);
        const data = await response.json();
        setTaxBrackets(data['2024']);
      } catch (error) {
        console.error('Vergi dilimleri alınamadı:', error);
      }
    };

    fetchTaxBrackets();
  }, []);

  const calculateTaxBreakdown = (income) => {
    if (!taxBrackets || income <= 0) return [];
    
    const brackets = taxBrackets.vergi_dilimleri;
    const breakdown = [];
    let remainingIncome = income;
    let totalTaxSoFar = 0;
    
    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      
      const bracketSize = bracket.ust_limit 
        ? bracket.ust_limit - bracket.alt_limit + (bracket.alt_limit === 0 ? 0 : 1)
        : Infinity;
      
      const taxableInThisBracket = Math.min(remainingIncome, bracketSize);
      const taxInThisBracket = taxableInThisBracket * bracket.oran / 100;
      
      if (taxableInThisBracket > 0) {
        breakdown.push({
          start: bracket.alt_limit,
          end: bracket.ust_limit,
          rate: bracket.oran,
          taxable: taxableInThisBracket,
          tax: taxInThisBracket
        });
        
        totalTaxSoFar += taxInThisBracket;
      }
      
      remainingIncome -= taxableInThisBracket;
    }
    
    return breakdown;
  };

  const calculateTax = (income) => {
    if (!taxBrackets || income <= 0) return 0;
    return calculateTaxBreakdown(income).reduce((sum, bracket) => sum + bracket.tax, 0);
  };

  // Özet tablodaki kâr/zarar ve temettü toplamlarını hesapla
  const totals = trades.reduce((acc, trade) => {
    if (trade.type === 'Temettü') {
      acc.dividendTL += trade.priceTL;
    }
    return acc;
  }, { profitTL: 0, dividendTL: 0 });

  // Özet tablodaki kâr değerlerini kullan
  Object.keys(profitLoss).forEach(symbol => {
    const profit = profitLoss[symbol];
    if (profit > 0) {
      totals.profitTL += profit;
    }
  });

  // Temettü vergisi hesapla
  const taxableDividend = totals.dividendTL > (taxBrackets?.temettu_istisnasi || 0) ? totals.dividendTL : 0;
  
  // Toplam vergilendirilebilir gelir
  const totalTaxableIncome = totals.profitTL + taxableDividend;
  
  // Toplam vergi
  const totalTax = calculateTax(totalTaxableIncome);

  if (!taxBrackets) return <div>Vergi bilgileri yükleniyor...</div>;

  const renderTaxBracketsTooltip = () => (
    <div className="tax-brackets-tooltip">
      <table>
        <thead>
          <tr>
            <th>Gelir Aralığı</th>
            <th>Vergi Oranı</th>
          </tr>
        </thead>
        <tbody>
          {taxBrackets.vergi_dilimleri.map((bracket, index) => (
            <tr key={index}>
              <td>
                {bracket.alt_limit === 0 ? '0' : formatNumber(bracket.alt_limit)} - {bracket.ust_limit ? formatNumber(bracket.ust_limit) : '∞'} ₺
              </td>
              <td>
                <span className="rate-value">%{bracket.oran}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="2" style={{ textAlign: 'left', fontStyle: 'italic', color: '#666', fontSize: '0.85rem', paddingTop: '0.8rem' }}>
              Temettü istisnası: {formatNumber(taxBrackets.temettu_istisnasi)} ₺
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  const renderDividendTooltip = () => (
    <div className="tooltip dividend-tooltip">
      <div>İstisna Tutarı: {formatNumber(taxBrackets.temettu_istisnasi)} ₺</div>
    </div>
  );

  return (
    <div className="tax-calculation-container">
      <div className="tax-calculation">
        <h3>
          Vergi Hesaplaması
          <div 
            ref={iconRef}
            className="info-icon"
            onMouseEnter={() => setShowTaxTooltip(true)}
            onMouseLeave={() => setShowTaxTooltip(false)}
            role="button"
            aria-label="Vergi dilimleri bilgisi"
          >
            ℹ️
            {showTaxTooltip && (
              <div className="tooltip">
                {renderTaxBracketsTooltip()}
              </div>
            )}
          </div>
        </h3>
        <table className="tax-table">
          <thead>
            <tr>
              <th>Gelir Türü</th>
              <th>Tutar (₺)</th>
              <th>Vergilendirilebilir (₺)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kâr</td>
              <td>{formatNumber(totals.profitTL.toFixed(2))}</td>
              <td>{formatNumber(totals.profitTL.toFixed(2))}</td>
            </tr>
            <tr>
              <td>Temettü</td>
              <td>{formatNumber(totals.dividendTL.toFixed(2))}</td>
              <td>{formatNumber(taxableDividend.toFixed(2))}</td>
            </tr>
            <tr className="total-row">
              <td>Toplam</td>
              <td>{formatNumber((totals.profitTL + totals.dividendTL).toFixed(2))}</td>
              <td>{formatNumber(totalTaxableIncome.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>

        <div className="tax-summary">
          <div className="calculation-explanation">
            <p>Vergi dilimleri bazında hesaplama:</p>
            <table className="tax-breakdown-table">
              <thead>
                <tr>
                  <th>Dilim</th>
                  <th>Oran</th>
                  <th>Vergi</th>
                </tr>
              </thead>
              <tbody>
                {calculateTaxBreakdown(totalTaxableIncome).map((bracket, index) => (
                  <tr key={index}>
                    <td>
                      {formatNumber(bracket.start)} - {typeof bracket.end === 'number' ? formatNumber(bracket.end) : bracket.end}
                    </td>
                    <td>%{bracket.rate}</td>
                    <td>{formatNumber(bracket.tax.toFixed(2))} ₺</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="tax-detail total">
            <span>Ödenecek Vergi:</span>
            <span>{formatNumber(totalTax.toFixed(2))} ₺</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxCalculation; 