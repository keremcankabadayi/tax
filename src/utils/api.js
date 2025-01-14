const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';
const BASE_URL = 'https://getpantry.cloud/apiv1/pantry';

// Rate limit için kuyruk sistemi
let requestQueue = Promise.resolve();
const RATE_LIMIT_DELAY = 1000; // 1000ms delay between requests
const MAX_RETRIES = 3; // Maximum number of retries
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

export const fetchFromPantry = async (basketName, retryCount = 0, onRetry = null) => {
  // Kuyruğa yeni istek ekle
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue
      .then(async () => {
        try {
          const response = await fetch(`${BASE_URL}/${PANTRY_ID}/basket/${basketName}`);
          
          if (response.status === 429 && retryCount < MAX_RETRIES) {
            // Rate limit aşıldı, exponential backoff ile tekrar dene
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            if (onRetry) {
              onRetry(retryCount + 1, retryDelay);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchFromPantry(basketName, retryCount + 1, onRetry);
          }
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
        
        // Rate limit için delay ekle
        return new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      })
      .catch(reject);
  });
}; 

export const fetchFAQData = async () => {
  try {
    const response = await fetchFromPantry('faq');
    return response;
  } catch (error) {
    console.error('FAQ verileri alınamadı:', error);
    throw error;
  }
}; 