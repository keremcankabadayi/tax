import React, { useState, useEffect } from 'react';
import { fetchFAQData } from '../utils/api';
import './FAQ.css';

function FAQ() {
  const [faqData, setFaqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openQuestion, setOpenQuestion] = useState(null);

  useEffect(() => {
    const loadFAQData = async (retryCount = 0) => {
      try {
        const data = await fetchFAQData();
        setFaqData(data.faq || []);
        setLoading(false);
      } catch (error) {
        console.error('FAQ verileri yüklenemedi:', error);
        if (error.message?.includes('429')) {
          // Exponential backoff with max delay of 10 seconds
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadFAQData(retryCount + 1);
        }
        setLoading(false);
      }
    };

    loadFAQData();
  }, []);

  const toggleQuestion = (index) => {
    setOpenQuestion(openQuestion === index ? null : index);
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
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