import React, { useState, useEffect, useRef } from 'react';
import './TaxCalculation.css';

const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';

const TaxCalculation = ({ trades, profitLoss, temettuIstisnasi }) => {
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

  const calculateTotals = () => {
    let totalDividend = 0;
    let totalCommission = 0;
    let totalWithholding = 0;

    const totalProfitLoss = Object.values(profitLoss).reduce((sum, value) => sum + (value || 0), 0);

    trades.forEach(trade => {
      if (trade.type === 'Satış') {
        totalCommission += Number(trade.commissionTL || 0);
        totalWithholding += Number((trade.withholding * trade.exchangeRate) || 0);
      } else if (trade.type === 'Temettü') {
        totalDividend += Number(trade.priceTL || 0);
        totalWithholding += Number((trade.withholding * trade.exchangeRate) || 0);
      }
    });

    const exemptDividend = Math.min(totalDividend, temettuIstisnasi || 0);
    const taxableDividend = Math.max(0, totalDividend - (temettuIstisnasi || 0));

    const taxableIncome = totalProfitLoss + taxableDividend - totalCommission - totalWithholding;

    return {
      totalProfitLoss,
      totalDividend,
      exemptDividend,
      taxableDividend,
      totalCommission,
      totalWithholding,
      taxableIncome
    };
  };

  const {
    totalProfitLoss,
    totalDividend,
    exemptDividend,
    taxableDividend,
    totalCommission,
    totalWithholding,
    taxableIncome
  } = calculateTotals();

  const taxAmount = calculateTax(taxableIncome);

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
      </table>
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
          <tbody>
            <tr>
              <td>Alım-Satım Kâr/Zarar</td>
              <td>{formatNumber(totalProfitLoss.toFixed(2))}</td>
            </tr>
            <tr>
              <td>Temettü Geliri</td>
              <td>
                {formatNumber(totalDividend.toFixed(2))}
                <span style={{ marginLeft: '8px', color: '#666', fontSize: '0.9em' }}>
                  (Vergiye Tabi: {formatNumber(taxableDividend.toFixed(2))})
                </span>
              </td>
            </tr>
            <tr>
              <td>Komisyon Gideri</td>
              <td>-{formatNumber(totalCommission.toFixed(2))}</td>
            </tr>
            <tr>
              <td>Stopaj Gideri</td>
              <td>-{formatNumber(totalWithholding.toFixed(2))}</td>
            </tr>
            <tr className="total-row">
              <td>Vergiye Tabi Gelir</td>
              <td>{formatNumber(taxableIncome.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>

        {calculateTaxBreakdown(taxableIncome).length > 0 && (
          <div className="tax-breakdown">
            <h4>Vergi Dilimi Detayları</h4>
            <table className="tax-breakdown-table">
              <thead>
                <tr>
                  <th>Dilim</th>
                  <th>Matrah</th>
                  <th>Oran</th>
                  <th>Vergi</th>
                </tr>
              </thead>
              <tbody>
                {calculateTaxBreakdown(taxableIncome).map((bracket, index) => (
                  <tr key={index}>
                    <td>
                      {formatNumber(bracket.start)} - {bracket.end ? formatNumber(bracket.end) : '∞'} ₺
                    </td>
                    <td>{formatNumber(bracket.taxable.toFixed(2))}</td>
                    <td>%{bracket.rate}</td>
                    <td>{formatNumber(bracket.tax.toFixed(2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total-tax-container">
              <span className="total-tax-label">Toplam Vergi:</span>
              <span className="total-tax-amount">{formatNumber(taxAmount.toFixed(2))} ₺</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaxCalculation; 