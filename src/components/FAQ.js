import React, { useState, useEffect } from 'react';
import { fetchFAQData } from '../utils/api';
import './FAQ.css';

function FAQ() {
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openQuestion, setOpenQuestion] = useState(null);

  useEffect(() => {
    const loadFAQData = async () => {
      try {
        const data = await fetchFAQData();
        setFaqData(data.faq || []);
      } catch (error) {
        console.error('FAQ verileri yüklenemedi:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFAQData();
  }, []);

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  if (loading) {
    return <div className="faq-container">Yükleniyor...</div>;
  }

  return (
    <div className="faq-container">
      <div className="faq-list">
        {faqData.map((item, index) => (
          <div key={index} className="faq-item">
            <div
              className={`faq-question ${openQuestion === index ? 'active' : ''}`}
              onClick={() => toggleQuestion(index)}
            >
              {item.question}
              <span>{openQuestion === index ? '−' : '+'}</span>
            </div>
            {openQuestion === index && (
              <div className="faq-answer">{item.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default FAQ; 