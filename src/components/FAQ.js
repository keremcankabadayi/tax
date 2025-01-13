import React, { useState } from 'react';
import './FAQ.css';

const FAQ = () => {
  const [openQuestion, setOpenQuestion] = useState(null);

  const faqData = [
    {
      id: 1,
      question: "Vergi hesaplaması nasıl yapılıyor?",
      answer: "Vergi hesaplaması, Gelir Vergisi Kanunu'na göre yapılmaktadır. Hisse satışlarından elde edilen kârlar ve temettü gelirleri için ayrı hesaplamalar yapılır. Alış maliyetleri TÜFE artış oranına göre endekslenir ve %10'dan fazla artış olması durumunda maliyet artırımı yapılır."
    },
    {
      id: 2,
      question: "Temettü istisnası nedir?",
      answer: "Temettü istisnası, yıllık olarak belirlenen bir tutara kadar olan temettü gelirlerinin vergiden muaf tutulmasıdır. 2024 yılı için bu tutar 5.250 TL'dir. Bu tutarın üzerindeki temettü gelirleri beyan edilir ve vergilendirilir."
    },
    {
      id: 3,
      question: "Döviz kurları nasıl hesaplanıyor?",
      answer: "İşlem tarihindeki TCMB döviz alış kuru kullanılmaktadır. Eğer işlem hafta sonuna denk geliyorsa, bir önceki iş gününün kuru kullanılır. Veriler düzenli olarak TCMB'den güncellenmektedir."
    },
    {
      id: 4,
      question: "Maliyet endekslemesi nasıl yapılıyor?",
      answer: "Maliyet endekslemesi, alış tarihinden satış tarihine kadar geçen süredeki TÜFE artış oranına göre yapılır. Artış oranı %10'u geçerse, alış maliyeti bu oranda artırılır. Bu hesaplama otomatik olarak yapılmaktadır."
    }
  ];

  const toggleQuestion = (id) => {
    setOpenQuestion(openQuestion === id ? null : id);
  };

  return (
    <div className="faq-container">
      <h1>Sıkça Sorulan Sorular</h1>
      <div className="faq-list">
        {faqData.map((faq) => (
          <div 
            key={faq.id} 
            className={`faq-item ${openQuestion === faq.id ? 'open' : ''}`}
          >
            <div 
              className="faq-question"
              onClick={() => toggleQuestion(faq.id)}
            >
              <span>{faq.question}</span>
              <span className="faq-icon">{openQuestion === faq.id ? '−' : '+'}</span>
            </div>
            <div className="faq-answer">
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQ; 