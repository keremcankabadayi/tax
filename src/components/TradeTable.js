import React, { useState, useEffect, useRef } from 'react';
import './TradeTable.css';
import Notification from './Notification';
import SaleDetails from './SaleDetails';
import DividendDetails from './DividendDetails';
import TaxCalculation from './TaxCalculation';
import TradeModal from './TradeModal';
import DeleteConfirmModal from './DeleteConfirmModal';
import { fetchFromPantry } from '../utils/api';

const STORAGE_KEY = 'tax_trades_data';
const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';

// Sayı formatlama fonksiyonu
const formatNumber = (number) => {
  if (number === null || number === undefined) return '';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

// Tarihi Türkçe formata çevir
const formatDateTR = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDate();
  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

// Tarihten bir önceki ayın endeks değerini bul
const getIndexForDate = (date, indexData) => {
  const d = new Date(date);
  // Bir önceki ay
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-11 arası

  // Eğer ocak ayındaysak (0), önceki ay aralık (11) ve önceki yıl olacak
  if (month === 0) {
    month = 11;
    year = year - 1;
  } else {
    month = month - 1;
  }
  
  const monthNames = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 
                     'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

  const yearData = indexData.find(y => y.yil === year);
  if (!yearData) return null;

  const indexValue = yearData.aylar[monthNames[month]];
  return indexValue ? Number(indexValue.replace(',', '.')) : null;
};

const TradeTable = ({ temettuIstisnasi }) => {
  // localStorage'dan verileri al veya boş array kullan
  const initialTrades = () => {
    const savedTrades = localStorage.getItem(STORAGE_KEY);
    return savedTrades ? JSON.parse(savedTrades) : [];
  };

  const [trades, setTrades] = useState(initialTrades);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [remainingShares, setRemainingShares] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [indexData, setIndexData] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({});
  const [profitLossTL, setProfitLossTL] = useState({});
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    type: 'Alış',
    quantity: '',
    price: '',
    date: '',
    commission: ''
  });
  const [openRows, setOpenRows] = useState([]);
  const menuRefs = useRef({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExchangeRates, setIsLoadingExchangeRates] = useState(true);
  const [isLoadingIndexData, setIsLoadingIndexData] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tradeToDelete, setTradeToDelete] = useState(null);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState({
    key: 'symbol',
    direction: 'ascending'
  });

  // Exchange rate verilerini çek
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const exchangeRateData = await fetchFromPantry('usdtry', 0, (count, delay) => {
          setRetryCount(count);
          setRetryDelay(delay);
        });
        const indexData = await fetchFromPantry('yiufe', 0, (count, delay) => {
          setRetryCount(count);
          setRetryDelay(delay);
        });
        
        // Exchange rates işleme
        const sortedData = Object.entries(exchangeRateData)
          .filter(([key]) => key !== 'key')
          .sort(([dateA], [dateB]) => {
            const [dayA, monthA, yearA] = dateA.split('.');
            const [dayB, monthB, yearB] = dateB.split('.');
            return new Date(yearB, monthB - 1, dayB) - new Date(yearA, monthA - 1, dayA);
          })
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        setExchangeRates(sortedData);
        setIsLoadingExchangeRates(false);
        setRetryCount(0);
        
        // Endeks verilerini çek
        if (indexData.veriler) {
          setIndexData(indexData.veriler);
        }
        setIsLoadingIndexData(false);
        setRetryCount(0);
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!error.message?.includes('429')) {
          addNotification('Veriler alınamadı. Lütfen sayfayı yenileyin.', 'error');
        }
      } finally {
        setLoading(false);
        setRetryCount(0);
        setRetryDelay(0);
      }
    };

    fetchData();
  }, []);

  // İşlem tarihine göre döviz kurunun bulunması
  const getExchangeRateForDate = (date) => {
    // Verilen tarihten bir önceki iş gününün kurunun bulunması
    const [year, month, day] = date.split('-');
    const formattedDate = `${day}.${month}.${year}`;
    
    console.log('Debug - Finding Exchange Rate:', {
      searchDate: formattedDate,
      availableRates: Object.keys(exchangeRates).slice(0, 5) // İlk 5 tarihi göster
    });
    
    // Tarihleri dolaş ve verilen tarihten önceki ilk kuru bul
    for (const [rateDate, rateData] of Object.entries(exchangeRates)) {
      const [rateDay, rateMonth, rateYear] = rateDate.split('.');
      const rateDateTime = new Date(rateYear, rateMonth - 1, rateDay);
      const tradeDateTime = new Date(year, month - 1, day);
      
      if (rateDateTime < tradeDateTime) {
        console.log('Debug - Found Rate:', {
          rateDate: rateDate,
          rate: rateData.forex_buying
        });
        return rateData.forex_buying;
      }
    }
    
    // Eğer uygun kur bulunamazsa en son kuru kullan
    const lastRate = Object.values(exchangeRates)[0];
    console.log('Debug - Using Last Rate:', {
      lastRate: lastRate ? lastRate.forex_buying : null
    });
    return lastRate ? lastRate.forex_buying : null;
  };

  // Verileri localStorage'a kaydet
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  }, [trades]);

  // Bildirim eklemek için yardımcı fonksiyon
  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
  };

  // Bildirimi kaldırmak için yardımcı fonksiyon
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Bugünün tarihini YYYY-MM-DD formatında al
  const today = new Date().toISOString().split('T')[0];

  // FIFO hesaplaması için işlemleri takip et
  useEffect(() => {
    const calculateFIFO = () => {
      const stockLedger = {};
      const remaining = {};
      const profitLossCalc = {};
      const symbols = [...new Set(trades.map(trade => trade.symbol))];

      // Her sembol için kâr/zarar hesapla
      symbols.forEach(symbol => {
        const trades_by_symbol = trades.filter(trade => trade.symbol === symbol);
        let totalProfitTL = 0;
        
        const stockLedger = [];
        trades_by_symbol.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trade => {
          if (trade.type === 'Alış') {
            stockLedger.push({
              quantity: Number(trade.quantity),
              price: Number(trade.price),
              exchangeRate: Number(trade.exchangeRate),
              date: trade.date
            });
            if (!remaining[symbol]) remaining[symbol] = 0;
            remaining[symbol] += Number(trade.quantity);
          } else if (trade.type === 'Satış') {
            let remainingSell = Number(trade.quantity);
            const sellPrice = Number(trade.price);
            const sellExchangeRate = Number(trade.exchangeRate);
            const saleDate = trade.date;
            const saleIndex = getIndexForDate(saleDate, indexData);

            while (remainingSell > 0 && stockLedger.length > 0) {
              const oldestBuy = stockLedger[0];
              const sellQuantity = Math.min(remainingSell, oldestBuy.quantity);
              
              // TL cinsinden kâr/zarar hesapla
              const buyPriceTL = oldestBuy.price * oldestBuy.exchangeRate;
              const sellPriceTL = sellPrice * sellExchangeRate;

              // Endeks değişimini kontrol et
              const buyIndex = getIndexForDate(oldestBuy.date, indexData);
              let adjustedBuyPriceTL = buyPriceTL;

              if (buyIndex && saleIndex) {
                const indexChange = ((saleIndex - buyIndex) / buyIndex) * 100;
                if (indexChange >= 10) {
                  adjustedBuyPriceTL = buyPriceTL * (1 + (indexChange / 100));
                }
              }

              const profitTL = (sellPriceTL - adjustedBuyPriceTL) * sellQuantity;
              totalProfitTL += profitTL;

              if (sellQuantity === oldestBuy.quantity) {
                stockLedger.shift();
              } else {
                oldestBuy.quantity -= sellQuantity;
              }
              
              remainingSell -= sellQuantity;
              if (!remaining[symbol]) remaining[symbol] = 0;
              remaining[symbol] -= sellQuantity;
            }
          }
        });

        profitLossCalc[symbol] = totalProfitTL;
      });

      setRemainingShares(remaining);
      setProfitLossTL(profitLossCalc);
    };

    calculateFIFO();
  }, [trades, indexData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrade(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTrade = async () => {
    if (newTrade.symbol && newTrade.price && newTrade.date && 
        (newTrade.type === 'Temettü' || newTrade.quantity)) {
      try {
        // Satış işlemi için tarih kontrolü
        if (newTrade.type === 'Satış') {
          // İlgili sembolün en eski alım tarihini bul
          const relevantTrades = editingIndex !== null 
            ? trades.filter((_, index) => index !== editingIndex) // Düzenleme modunda mevcut işlemi hariç tut
            : trades;

          const firstPurchase = relevantTrades
            .filter(t => t.symbol === newTrade.symbol && t.type === 'Alış')
            .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

          if (firstPurchase && new Date(newTrade.date) < new Date(firstPurchase.date)) {
            addNotification(`${newTrade.symbol} için ilk alım tarihi ${formatDateTR(firstPurchase.date)}. Bu tarihten önce satış yapılamaz.`, 'error');
            return;
          }
        }

        const exchangeRate = getExchangeRateForDate(newTrade.date);
        
        if (!exchangeRate) {
          addNotification('Seçilen tarih için döviz kuru bulunamadı.', 'error');
          return;
        }

        const quantity = newTrade.type === 'Temettü' ? 
          (remainingShares[newTrade.symbol] || 0) : 
          Number(newTrade.quantity);

        const commission = Number(newTrade.commission) || 0;
        const commissionTL = commission * exchangeRate;

        const tradeWithTL = {
          ...newTrade,
          quantity: quantity,
          price: Number(newTrade.price),
          commission: commission,
          commissionTL: commissionTL,
          exchangeRate: exchangeRate,
          priceTL: Number(newTrade.price) * exchangeRate * (newTrade.type === 'Temettü' ? 1 : quantity)
        };

        if (editingIndex !== null) {
          // Düzenleme modu
          const updatedTrades = [...trades];
          
          if (tradeWithTL.type === 'Satış') {
            // Düzenlenen işlem hariç diğer işlemleri hesapla
            const otherTrades = trades.filter((_, index) => index !== editingIndex);
            const tempStockLedger = {};
            
            // Stok hesapla
            otherTrades.forEach(trade => {
              if (!tempStockLedger[trade.symbol]) {
                tempStockLedger[trade.symbol] = 0;
              }
              if (trade.type === 'Alış') {
                tempStockLedger[trade.symbol] += Number(trade.quantity);
              } else if (trade.type === 'Satış') {
                tempStockLedger[trade.symbol] -= Number(trade.quantity);
              }
            });

            // Düzenlenen işlemin sembolü için stok kontrolü yap
            const availableShares = tempStockLedger[tradeWithTL.symbol] || 0;
            if (Number(tradeWithTL.quantity) > availableShares) {
              addNotification(`Yetersiz hisse! ${tradeWithTL.symbol} için satılabilecek maksimum adet: ${availableShares}`, 'error');
              return;
            }
          }

          updatedTrades[editingIndex] = tradeWithTL;
          setTrades(updatedTrades);
          setEditingIndex(null);
          addNotification('İşlem başarıyla güncellendi.', 'success');
        } else {
          // Yeni işlem ekleme modu
          if (tradeWithTL.type === 'Satış') {
            const availableShares = remainingShares[newTrade.symbol] || 0;
            if (Number(newTrade.quantity) > availableShares) {
              addNotification(`Yetersiz hisse! ${newTrade.symbol} için satılabilecek maksimum adet: ${availableShares}`, 'error');
              return;
            }
          } else if (tradeWithTL.type === 'Temettü' && quantity === 0) {
            addNotification(`${newTrade.symbol} için eldeki hisse bulunmamaktadır!`, 'error');
            return;
          }

          setTrades(prev => [...prev, tradeWithTL]);
          addNotification('Yeni işlem başarıyla eklendi.', 'success');
        }
        
        // Modal'ı kapat ve state'leri sıfırla
        setIsModalOpen(false);
        setNewTrade({
          symbol: '',
          type: 'Alış',
          quantity: '',
          price: '',
          date: '',
          commission: ''
        });
        setEditingIndex(null);
      } catch (error) {
        addNotification('İşlem eklenirken hata oluştu: ' + error.message, 'error');
      }
    } else {
      addNotification('Lütfen tüm alanları doldurun.', 'error');
    }
  };

  const handleEdit = (index) => {
    const tradeToEdit = trades[index];
    setNewTrade({ ...tradeToEdit });
    setEditingIndex(index);
    setIsAdding(true);
  };

  const handleDelete = (index) => {
    const tradeToDelete = trades[index];
    
    // Satış işlemlerini kontrol et
    if (tradeToDelete.type === 'Alış') {
      // Bu alış işleminden sonraki satışları kontrol et
      const laterTrades = trades.slice(index + 1);
      const symbol = tradeToDelete.symbol;
      let availableShares = 0;
      
      // İlgili hissenin kalan bakiyesini hesapla
      trades.slice(0, index).forEach(trade => {
        if (trade.symbol === symbol) {
          if (trade.type === 'Alış') {
            availableShares += Number(trade.quantity);
          } else {
            availableShares -= Number(trade.quantity);
          }
        }
      });

      // Sonraki satışları kontrol et
      let requiredShares = 0;
      laterTrades.forEach(trade => {
        if (trade.symbol === symbol && trade.type === 'Satış') {
          requiredShares += Number(trade.quantity);
        }
      });

      // Eğer bu alış işleminin silinmesi durumunda yetersiz hisse olacaksa
      if (requiredShares > availableShares) {
        addNotification('Bu alış işlemi silinemez çünkü sonraki satış işlemleri için gerekli!', 'error');
        return;
      }
    }

    const updatedTrades = trades.filter((_, i) => i !== index);
    setTrades(updatedTrades);
    addNotification('İşlem başarıyla silindi.', 'success');
    setIsDeleteModalOpen(false);
    setTradeToDelete(null);
  };

  // Mevcut sembolleri al
  const getAvailableSymbols = () => {
    const symbols = new Set();
    
    // Eğer temettü işlemi ise, herhangi bir zamanda alınmış ve hala elde olan hisseleri göster
    if (newTrade.type === 'Temettü') {
      // Sadece eldeki adedi 0'dan büyük olan sembolleri göster
      Object.entries(remainingShares).forEach(([symbol, quantity]) => {
        if (quantity > 0) {
          symbols.add(symbol);
        }
      });
    } else if (newTrade.type === 'Satış') {
      // Düzenleme modunda
      if (editingIndex !== null) {
        // Düzenlenen işlem hariç diğer işlemleri hesapla
        const otherTrades = trades.filter((_, index) => index !== editingIndex);
        const tempStockLedger = {};
        
        // Stok hesapla
        otherTrades.forEach(trade => {
          if (!tempStockLedger[trade.symbol]) {
            tempStockLedger[trade.symbol] = 0;
          }
          if (trade.type === 'Alış') {
            tempStockLedger[trade.symbol] += Number(trade.quantity);
          } else if (trade.type === 'Satış') {
            tempStockLedger[trade.symbol] -= Number(trade.quantity);
          }
        });

        // Düzenlenen işlemin sembolünü ekle
        const editedTrade = trades[editingIndex];
        symbols.add(editedTrade.symbol);

        // Diğer sembolleri kontrol et
        Object.entries(tempStockLedger).forEach(([symbol, quantity]) => {
          if (quantity > 0) {
            symbols.add(symbol);
          }
        });
      } else {
        // Yeni satış işlemi için eldeki hisseleri göster
        Object.entries(remainingShares).forEach(([symbol, quantity]) => {
          if (quantity > 0) {
            symbols.add(symbol);
          }
        });
      }
    }
    
    return Array.from(symbols).sort();
  };

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedSymbols = (symbols) => {
    if (!sortConfig.key) return symbols;

    return [...symbols].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'symbol':
          aValue = a;
          bValue = b;
          break;
        case 'quantity':
          aValue = remainingShares[a] || 0;
          bValue = remainingShares[b] || 0;
          break;
        case 'profit':
          aValue = profitLossTL[a] || 0;
          bValue = profitLossTL[b] || 0;
          break;
        case 'dividend':
          const aDividends = trades.filter(t => t.symbol === a && t.type === 'Temettü')
            .reduce((sum, t) => sum + (Number(t.priceTL) || 0), 0);
          const bDividends = trades.filter(t => t.symbol === b && t.type === 'Temettü')
            .reduce((sum, t) => sum + (Number(t.priceTL) || 0), 0);
          aValue = aDividends;
          bValue = bDividends;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  // Sembol bazında özet bilgileri göster
  const renderSummary = () => {
    const symbols = [...new Set(trades.map(trade => trade.symbol))];
    const sortedSymbols = getSortedSymbols(symbols);
    
    // TL cinsinden temettü hesapla
    const dividendTotals = {};
    
    symbols.forEach(symbol => {
      const trades_by_symbol = trades.filter(trade => trade.symbol === symbol);
      let totalDividendUSD = 0;
      let totalDividendTL = 0;
      
      trades_by_symbol.forEach(trade => {
        if (trade.type === 'Temettü') {
          totalDividendUSD += Number(trade.price) || 0;
          totalDividendTL += Number(trade.priceTL) || 0;
        }
      });
      
      dividendTotals[symbol] = {
        usd: totalDividendUSD,
        tl: totalDividendTL
      };
    });

    // Toplam kâr/zarar ve temettü
    const totalProfitLossTL = Object.values(profitLossTL).reduce((sum, value) => sum + (value || 0), 0);
    const totalDividendUSD = Object.values(dividendTotals).reduce((sum, value) => sum + (value?.usd || 0), 0);
    const totalDividendTL = Object.values(dividendTotals).reduce((sum, value) => sum + (value?.tl || 0), 0);

    return (
      <div className="summary-section">
        <h3>Özet Bilgiler</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('symbol')} style={{ cursor: 'pointer' }}>
                Sembol {sortConfig.key === 'symbol' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('quantity')} style={{ cursor: 'pointer' }}>
                Eldeki Adet {sortConfig.key === 'quantity' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('profit')} style={{ cursor: 'pointer' }}>
                Kâr/Zarar (₺) {sortConfig.key === 'profit' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('dividend')} style={{ cursor: 'pointer' }}>
                Temettü (₺) {sortConfig.key === 'dividend' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedSymbols.map(symbol => (
              <>
                <tr 
                  key={symbol} 
                  className={`summary-row ${openRows.includes(`summary-${symbol}`) ? 'expanded' : ''}`}
                  onClick={() => {
                    const hasDividends = trades.some(t => t.symbol === symbol && t.type === 'Temettü');
                    if (hasDividends) {
                      setOpenRows(prev => {
                        const key = `summary-${symbol}`;
                        if (prev.includes(key)) {
                          return prev.filter(i => i !== key);
                        } else {
                          return [...prev, key];
                        }
                      });
                    }
                  }}
                  style={{ cursor: trades.some(t => t.symbol === symbol && t.type === 'Temettü') ? 'pointer' : 'default' }}
                >
                  <td>
                    {trades.some(t => t.symbol === symbol && t.type === 'Temettü') && (
                      <span className={`collapse-icon ${openRows.includes(`summary-${symbol}`) ? 'open' : ''}`}>▶</span>
                    )}
                    {symbol}
                  </td>
                  <td>{formatNumber(remainingShares[symbol] || 0)}</td>
                  <td className={(profitLossTL[symbol] || 0) >= 0 ? 'profit' : 'loss'}>
                    {formatNumber((profitLossTL[symbol] || 0).toFixed(2))}
                  </td>
                  <td>{formatNumber((dividendTotals[symbol]?.tl || 0).toFixed(2))}</td>
                </tr>
                {openRows.includes(`summary-${symbol}`) && (
                  <tr className="dividend-details-row">
                    <td colSpan="4">
                      <table className="dividend-details-table">
                        <thead>
                          <tr>
                            <th>Tarih</th>
                            <th>Hisse Adedi</th>
                            <th>Hisse Başı ($)</th>
                            <th>Toplam ($)</th>
                            <th>Toplam (₺)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trades
                            .filter(t => t.symbol === symbol && t.type === 'Temettü')
                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                            .map((dividend, index) => (
                              <tr key={index}>
                                <td>{formatDateTR(dividend.date)}</td>
                                <td>{formatNumber(dividend.quantity || 0)}</td>
                                <td>{formatNumber(((dividend.price || 0) / (dividend.quantity || 1)).toFixed(4))}</td>
                                <td>{formatNumber((dividend.price || 0).toFixed(2))}</td>
                                <td>{formatNumber((dividend.priceTL || 0).toFixed(2))}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </>
            ))}
            <tr className="total-row">
              <td>TOPLAM</td>
              <td>-</td>
              <td className={totalProfitLossTL >= 0 ? 'profit' : 'loss'}>
                {formatNumber(totalProfitLossTL.toFixed(2))}
              </td>
              <td>{formatNumber(totalDividendTL.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const handleRowClick = (index) => {
    setOpenRows(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      } else {
        return [...prev, index];
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Açık olan menüleri kontrol et
      Object.entries(menuRefs.current).forEach(([key, ref]) => {
        if (ref && !ref.contains(event.target) && openRows.includes(key)) {
          setOpenRows(prev => prev.filter(item => item !== key));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openRows]);

  // Menü dışına tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.hamburger-menu')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="trade-table-container">
      <div className="notifications-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      <div className="two-column-layout">
        <div className="left-column">
          <div className="title-container">
          </div>
          {trades.length > 0 && renderSummary()}
          <div className="table-container">
            <div className="table-actions">
              <button 
                className="action-button add-trade-button"
                onClick={() => setIsModalOpen(true)}
              >
                <i>+</i> Yeni İşlem Ekle
              </button>
              <button 
                className="action-button reset-cache-button"
                onClick={() => setIsDeleteConfirmModalOpen(true)}
              >
                <i>🔄</i> Tüm Verileri Sıfırla
              </button>
            </div>
            <div className="table-responsive">
              <table className="trade-table">
                <thead>
                  <tr>
                    <th>İşlem Tarihi</th>
                    <th>İşlem Tipi</th>
                    <th>Sembol</th>
                    <th>Adet</th>
                    <th>Fiyat</th>
                    <th>Toplam</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {trades
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((trade, index) => (
                      <>
                        <tr 
                          key={`row-${index}`}
                          className={`trade-row ${openRows.includes(index) ? 'expanded' : ''}`} 
                          onClick={() => trade.type === 'Satış' && handleRowClick(index)}
                        >
                          <td>
                            {trade.type === 'Satış' && (
                              <span className={`collapse-icon ${openRows.includes(index) ? 'open' : ''}`}>▶</span>
                            )}
                            {formatDateTR(trade.date)}
                          </td>
                          <td>{trade.type}</td>
                          <td>{trade.symbol}</td>
                          <td>
                            {trade.type === 'Temettü' ? 
                              formatNumber(remainingShares[trade.symbol] || 0) :
                              formatNumber(trade.quantity)
                            }
                          </td>
                          <td>
                            {formatNumber(Number(trade.price).toFixed(2))}$
                          </td>
                          <td>
                            {formatNumber(Number(trade.quantity * trade.price).toFixed(2))}$
                            <span className="tl-value">({formatNumber(Number(trade.priceTL).toFixed(2))}₺)</span>
                          </td>
                          <td>
                            <div 
                              className="actions-menu"
                              ref={el => menuRefs.current[`menu-${index}`] = el}
                            >
                              <button 
                                className="menu-toggle" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const menuKey = `menu-${index}`;
                                  const currentOpen = openRows.includes(menuKey);
                                  setOpenRows(prev => 
                                    currentOpen 
                                      ? prev.filter(i => i !== menuKey)
                                      : [...prev, menuKey]
                                  );
                                }}
                              >
                                ⋮
                              </button>
                              {openRows.includes(`menu-${index}`) && (
                                <div className="menu-items">
                                  <button onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setNewTrade({ ...trade });
                                    setEditingIndex(index);
                                    setIsModalOpen(true);
                                  }}>
                                    Düzenle
                                  </button>
                                  <button onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setTradeToDelete({ ...trade, index });
                                    setIsDeleteModalOpen(true);
                                  }}>
                                    Sil
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {openRows.includes(index) && trade.type === 'Satış' && (
                          <tr key={`details-${index}`} className="details-row">
                            <td colSpan="7">
                              <SaleDetails 
                                trade={trade} 
                                trades={trades} 
                                indexData={indexData}
                                getIndexForDate={getIndexForDate}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sağ kolon: Vergi hesaplaması */}
        <div className="right-column">
          {trades.length > 0 && (
            <TaxCalculation 
              trades={trades}
              profitLoss={profitLossTL}
              temettuIstisnasi={temettuIstisnasi}
            />
          )}
        </div>
      </div>

      <TradeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingIndex(null);
          setNewTrade({
            symbol: '',
            type: 'Alış',
            quantity: '',
            price: '',
            date: '',
            commission: ''
          });
        }}
        trade={newTrade}
        onSave={handleAddTrade}
        onChange={handleInputChange}
        isEditing={editingIndex !== null}
        getExchangeRateForDate={getExchangeRateForDate}
        remainingShares={remainingShares}
        getAvailableSymbols={getAvailableSymbols}
        today={today}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTradeToDelete(null);
        }}
        onConfirm={() => handleDelete(tradeToDelete.index)}
        title="İşlemi Sil"
        message={tradeToDelete ? 
          `${tradeToDelete.symbol} hissesine ait ${tradeToDelete.date} tarihli ${tradeToDelete.type.toLowerCase()} işlemini silmek istediğinize emin misiniz?` 
          : ''}
      />

      <DeleteConfirmModal
        isOpen={isDeleteConfirmModalOpen}
        onClose={() => setIsDeleteConfirmModalOpen(false)}
        onConfirm={() => {
          localStorage.clear();
          window.location.reload();
        }}
        title="Tüm Verileri Sıfırla"
        message="Bu işlem tüm işlem geçmişinizi ve ayarlarınızı silecektir. Bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?"
      />

      {loading && (
        <div className="loading-message">
          {retryCount > 0 ? (
            `Rate limit aşıldı. ${retryCount}. deneme yapılıyor... (${retryDelay} saniye bekleniyor)`
          ) : (
            'Veriler yükleniyor...'
          )}
        </div>
      )}
    </div>
  );
};

export default TradeTable; 