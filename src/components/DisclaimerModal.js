import React, { useState } from 'react';
import './DisclaimerModal.css';

function DisclaimerModal({ isOpen, onAccept, onDecline }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleAccept = () => {
    if (dontShowAgain) {
      localStorage.setItem('disclaimerAccepted', 'true');
    }
    onAccept();
  };

  const handleDecline = () => {
    onDecline();
  };

  if (!isOpen) return null;

  return (
    <div className="disclaimer-modal-overlay">
      <div className="disclaimer-modal-content">
        <h2>Önemli Uyarı</h2>
        <div className="disclaimer-text">
          <p>Bu uygulama, ABD borsalarında işlem gören hisse senetleri ve ETF'ler için vergi hesaplamalarında yardımcı olmak amacıyla geliştirilmiş bir hobi projesidir.</p>
          
          <p><strong>Lütfen aşağıdaki hususları dikkatlice okuyunuz:</strong></p>
          
          <ol>
            <li>Bu uygulama herhangi bir resmi kurum veya kuruluş tarafından onaylanmamış veya denetlenmemiştir.</li>
            
            <li>Uygulamada yer alan tüm hesaplamalar, veriler ve bilgiler hatalı veya eksik olabilir.</li>
            
            <li>Bu uygulama profesyonel vergi danışmanlığı hizmeti yerine geçmez.</li>
            
            <li>Vergi beyannamelerinizi hazırlarken mutlaka bir mali müşavir veya vergi danışmanına danışmanızı öneririz.</li>
            
            <li>Uygulama geliştiricisi, uygulamanın kullanımından doğabilecek herhangi bir mali kayıp veya zarardan sorumlu tutulamaz.</li>
          </ol>

          <p>Bu uygulamayı kullanarak, yukarıdaki şartları kabul etmiş sayılırsınız.</p>
        </div>
        
        <div className="disclaimer-checkbox">
          <label>
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
            Bu uyarıyı tekrar gösterme
          </label>
        </div>
        
        <div className="disclaimer-buttons">
          <button onClick={handleDecline} className="decline-button">
            Kabul Etmiyorum
          </button>
          <button onClick={handleAccept} className="accept-button">
            Kabul Ediyorum
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisclaimerModal; 