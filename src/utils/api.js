const PANTRY_ID = '60e512d0-f495-4a56-b640-e0e30632d99f';
const BASE_URL = 'https://getpantry.cloud/apiv1/pantry';

// Rate limit için kuyruk sistemi
let requestQueue = Promise.resolve();
const RATE_LIMIT_DELAY = 500; // 500ms delay between requests

export const fetchFromPantry = async (basketName) => {
  // Kuyruğa yeni istek ekle
  return new Promise((resolve, reject) => {
    requestQueue = requestQueue
      .then(async () => {
        try {
          const response = await fetch(`${BASE_URL}/${PANTRY_ID}/basket/${basketName}`);
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