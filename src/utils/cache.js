// Cache için sabit değerler
const CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 1 hafta (milisaniye cinsinden)

// Cache'e veri kaydetme
export const setCacheData = (key, data) => {
  const cacheItem = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(cacheItem));
};

// Cache'den veri okuma
export const getCacheData = (key) => {
  const cachedItem = localStorage.getItem(key);
  if (!cachedItem) return null;

  const { data, timestamp } = JSON.parse(cachedItem);
  const now = Date.now();

  // Cache süresi dolmuşsa veriyi sil ve null dön
  if (now - timestamp > CACHE_EXPIRATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
};

// Cache'den veriyi silme
export const removeCacheData = (key) => {
  localStorage.removeItem(key);
}; 