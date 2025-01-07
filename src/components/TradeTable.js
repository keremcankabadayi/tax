import React, { useState, useEffect } from 'react';
import './TradeTable.css';
import Notification from './Notification';
import SaleDetails from './SaleDetails';

const STORAGE_KEY = 'tax_trades_data';
const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';

// Sayıyı virgüllü formata çevir
const formatNumber = (number) => {
  return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const TradeTable = () => {
  // localStorage'dan verileri al veya boş array kullan
  const initialTrades = () => {
    const savedTrades = localStorage.getItem(STORAGE_KEY);
    return savedTrades ? JSON.parse(savedTrades) : [];
  };

  const [trades, setTrades] = useState(initialTrades);
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [profitLoss, setProfitLoss] = useState({});
  const [remainingShares, setRemainingShares] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [indexData, setIndexData] = useState([]);
  const [newTrade, setNewTrade] = useState({
    symbol: '',
    type: 'Alış',
    quantity: '',
    price: '',
    exchangeRate: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [openRows, setOpenRows] = useState([]);

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
      const profitLossCalc = {};
      const remaining = {};

      // İşlemleri tarihe göre sırala
      const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date));

      sortedTrades.forEach(trade => {
        const symbol = trade.symbol;
        if (!stockLedger[symbol]) {
          stockLedger[symbol] = [];
          profitLossCalc[symbol] = 0;
          remaining[symbol] = 0;
        }

        if (trade.type === 'Alış') {
          // Alış işlemi: Hisseleri stoka ekle
          stockLedger[symbol].push({
            quantity: Number(trade.quantity),
            price: Number(trade.price),
            date: trade.date
          });
          remaining[symbol] += Number(trade.quantity);
        } else {
          // Satış işlemi: FIFO kuralına göre hesapla
          let remainingSell = Number(trade.quantity);
          const sellPrice = Number(trade.price);

          while (remainingSell > 0 && stockLedger[symbol].length > 0) {
            const oldestBuy = stockLedger[symbol][0];
            const sellQuantity = Math.min(remainingSell, oldestBuy.quantity);
            
            // Kâr/zarar hesapla
            const profit = (sellPrice - oldestBuy.price) * sellQuantity;
            profitLossCalc[symbol] += profit;

            // Kalan hisseleri güncelle
            remaining[symbol] -= sellQuantity;
            
            if (sellQuantity === oldestBuy.quantity) {
              stockLedger[symbol].shift(); // Tüm hisseler satıldı
            } else {
              oldestBuy.quantity -= sellQuantity; // Kısmi satış
            }
            
            remainingSell -= sellQuantity;
          }
        }
      });

      setProfitLoss(profitLossCalc);
      setRemainingShares(remaining);
    };

    calculateFIFO();
  }, [trades]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewTrade(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTrade = async () => {
    if (newTrade.symbol && newTrade.quantity && newTrade.price && newTrade.exchangeRate) {
      try {
        const tradeWithTL = {
          ...newTrade,
          quantity: Number(newTrade.quantity),
          price: Number(newTrade.price),
          exchangeRate: Number(newTrade.exchangeRate),
          priceTL: Number(newTrade.price) * Number(newTrade.exchangeRate) * Number(newTrade.quantity)
        };

        if (editingIndex !== null) {
          // Düzenleme modu
          const updatedTrades = [...trades];
          
          if (tradeWithTL.type === 'Satış') {
            // Düzenlenen işlemi hariç tut ve stok kontrolü yap
            const otherTrades = trades.filter((_, index) => index !== editingIndex);
            const tempStockLedger = {};
            
            otherTrades.forEach(trade => {
              if (!tempStockLedger[trade.symbol]) {
                tempStockLedger[trade.symbol] = 0;
              }
              if (trade.type === 'Alış') {
                tempStockLedger[trade.symbol] += Number(trade.quantity);
              } else {
                tempStockLedger[trade.symbol] -= Number(trade.quantity);
              }
            });

            const availableShares = tempStockLedger[newTrade.symbol] || 0;
            if (Number(newTrade.quantity) > availableShares) {
              addNotification(`Yetersiz hisse! ${newTrade.symbol} için satılabilecek maksimum adet: ${availableShares}`, 'error');
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
          }

          setTrades(prev => [...prev, tradeWithTL]);
          addNotification('Yeni işlem başarıyla eklendi.', 'success');
        }
        
        setNewTrade({
          symbol: '',
          type: 'Alış',
          quantity: '',
          price: '',
          exchangeRate: '',
          date: new Date().toISOString().split('T')[0]
        });
        setIsAdding(false);
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
    
    // Kullanıcıdan onay al
    const confirmMessage = `${tradeToDelete.symbol} hissesinin ${tradeToDelete.date} tarihli ${tradeToDelete.type.toLowerCase()} işlemini silmek istediğinize emin misiniz?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
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
  };

  // Mevcut sembolleri al (sadece eldeki hisseleri)
  const getAvailableSymbols = () => {
    const symbols = new Set();
    Object.entries(remainingShares).forEach(([symbol, quantity]) => {
      if (quantity > 0) {
        symbols.add(symbol);
      }
    });
    return Array.from(symbols).sort();
  };

  // Sembol bazında özet bilgileri göster
  const renderSummary = () => {
    const symbols = [...new Set(trades.map(trade => trade.symbol))];
    
    // TL cinsinden kâr/zarar hesapla
    const profitLossTL = {};
    symbols.forEach(symbol => {
      const trades_by_symbol = trades.filter(trade => trade.symbol === symbol);
      let totalProfitTL = 0;
      
      const stockLedger = [];
      trades_by_symbol.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(trade => {
        if (trade.type === 'Alış') {
          stockLedger.push({
            quantity: Number(trade.quantity),
            price: Number(trade.price),
            exchangeRate: Number(trade.exchangeRate)
          });
        } else {
          let remainingSell = Number(trade.quantity);
          const sellPrice = Number(trade.price);
          const sellExchangeRate = Number(trade.exchangeRate);

          while (remainingSell > 0 && stockLedger.length > 0) {
            const oldestBuy = stockLedger[0];
            const sellQuantity = Math.min(remainingSell, oldestBuy.quantity);
            
            // TL cinsinden kâr/zarar hesapla
            const buyPriceTL = oldestBuy.price * oldestBuy.exchangeRate;
            const sellPriceTL = sellPrice * sellExchangeRate;
            const profitTL = (sellPriceTL - buyPriceTL) * sellQuantity;
            totalProfitTL += profitTL;

            if (sellQuantity === oldestBuy.quantity) {
              stockLedger.shift();
            } else {
              oldestBuy.quantity -= sellQuantity;
            }
            
            remainingSell -= sellQuantity;
          }
        }
      });
      
      profitLossTL[symbol] = totalProfitTL;
    });

    return (
      <div className="trade-summary">
        <h3>Özet Bilgiler</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Sembol</th>
              <th>Eldeki Hisse</th>
              <th>Toplam Kâr/Zarar ($)</th>
              <th>Toplam Kâr/Zarar (₺)</th>
            </tr>
          </thead>
          <tbody>
            {symbols.map(symbol => (
              <tr key={symbol}>
                <td>{symbol}</td>
                <td>{formatNumber(remainingShares[symbol] || 0)}</td>
                <td className={profitLoss[symbol] >= 0 ? 'profit' : 'loss'}>
                  {formatNumber(Number(profitLoss[symbol] || 0).toFixed(2))}
                </td>
                <td className={profitLossTL[symbol] >= 0 ? 'profit' : 'loss'}>
                  {formatNumber(Number(profitLossTL[symbol] || 0).toFixed(2))}
                </td>
              </tr>
            ))}
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

  // PANTRY API'den veri çek
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://getpantry.cloud/apiv1/pantry/${PANTRY_ID}/basket/yiufe`);
        const data = await response.json();
        if (data.veriler) {
          setIndexData(data.veriler);
        }
      } catch (error) {
        console.error('PANTRY API Error:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="trade-table-container">
      <div className="notification-container">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
      
      <h2>Hisse/ETF İşlem Takibi</h2>
      {trades.length > 0 && renderSummary()}
      <div className="trade-table-wrapper">
        <table className="trade-table">
          <thead>
            <tr>
              <th>İşlem Tarihi</th>
              <th>İşlem Tipi</th>
              <th>Sembol</th>
              <th>Adet</th>
              <th>Fiyat ($)</th>
              <th>Döviz Kuru</th>
              <th>Fiyat (₺)</th>
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
                      {trade.date}
                    </td>
                    <td>{trade.type}</td>
                    <td>{trade.symbol}</td>
                    <td>{formatNumber(trade.quantity)}</td>
                    <td>{formatNumber(Number(trade.price).toFixed(2))}</td>
                    <td>{Number(trade.exchangeRate).toFixed(2)}</td>
                    <td>{formatNumber(Number(trade.priceTL).toFixed(2))}</td>
                    <td>
                      <button className="edit-btn" onClick={(e) => { e.stopPropagation(); handleEdit(index); }}>Düzenle</button>
                      <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(index); }}>Sil</button>
                    </td>
                  </tr>
                  {openRows.includes(index) && trade.type === 'Satış' && (
                    <tr key={`details-${index}`} className="details-row">
                      <td colSpan="8">
                        <SaleDetails trade={trade} trades={trades} indexData={indexData} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            {isAdding && (
              <tr className="adding-row">
                <td>
                  <input
                    type="date"
                    name="date"
                    value={newTrade.date}
                    onChange={handleInputChange}
                    max={today}
                    className="table-input"
                  />
                </td>
                <td>
                  <select
                    name="type"
                    value={newTrade.type}
                    onChange={handleInputChange}
                    className="table-input"
                  >
                    <option value="Alış">Alış</option>
                    <option value="Satış">Satış</option>
                  </select>
                </td>
                <td>
                  {newTrade.type === 'Alış' ? (
                    <input
                      type="text"
                      name="symbol"
                      value={newTrade.symbol}
                      onChange={handleInputChange}
                      placeholder="AAPL"
                      className="table-input"
                    />
                  ) : (
                    <select
                      name="symbol"
                      value={newTrade.symbol}
                      onChange={handleInputChange}
                      className="table-input"
                    >
                      <option value="">Sembol Seçin</option>
                      {getAvailableSymbols().map(symbol => (
                        <option key={symbol} value={symbol}>
                          {symbol} ({remainingShares[symbol] || 0} adet)
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <input
                    type="number"
                    name="quantity"
                    value={newTrade.quantity}
                    onChange={handleInputChange}
                    placeholder="100"
                    className="table-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="price"
                    value={newTrade.price}
                    onChange={handleInputChange}
                    placeholder={newTrade.type === 'Alış' ? 'Alış Fiyatı' : 'Satış Fiyatı'}
                    className="table-input"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    name="exchangeRate"
                    value={newTrade.exchangeRate}
                    onChange={handleInputChange}
                    placeholder="Döviz Kuru"
                    className="table-input"
                    step="0.01"
                  />
                </td>
                <td>
                  {newTrade.price && newTrade.exchangeRate && newTrade.quantity ? 
                    formatNumber((Number(newTrade.price) * Number(newTrade.exchangeRate) * Number(newTrade.quantity)).toFixed(2))
                    : '-'
                  }
                </td>
                <td>
                  <button className="save-btn" onClick={handleAddTrade}>
                    {editingIndex !== null ? 'Güncelle' : 'Kaydet'}
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => {
                      setIsAdding(false);
                      setEditingIndex(null);
                      setNewTrade({
                        symbol: '',
                        type: 'Alış',
                        quantity: '',
                        price: '',
                        exchangeRate: '',
                        date: new Date().toISOString().split('T')[0]
                      });
                    }}
                  >
                    İptal
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!isAdding && (
        <button className="add-trade-btn" onClick={() => setIsAdding(true)}>
          Yeni İşlem Ekle
        </button>
      )}
    </div>
  );
};

export default TradeTable; 