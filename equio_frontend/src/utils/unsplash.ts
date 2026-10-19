import apiClient from '../api/apiClient';

const FALLBACK_IMAGES: Record<string, string[]> = {
  japan: [
    'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80',
  ],
  travel: [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1000&q=80',
  ],
  home: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
  ],
  car: [
    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1000&q=80',
  ],
  savings: [
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=1000&q=80',
    'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1000&q=80',
  ],
};

function refineQuery(rawQuery: string): string {
  const query = rawQuery.trim();
  if (!query) return 'savings money';
  return query
    .replace(/\bviaje a\b/gi, 'travel')
    .replace(/\bviaje\b/gi, 'travel')
    .replace(/\bvacaciones en\b/gi, 'vacation')
    .replace(/\bvacaciones\b/gi, 'vacation')
    .replace(/\bcasa\b/gi, 'house')
    .replace(/\bcarro\b|\bauto\b|\bcoche\b/gi, 'car')
    .replace(/\bfondo de emergencia\b/gi, 'emergency fund savings')
    .replace(/\bahorro\b/gi, 'savings');
}

export function getDeterministicFallbackImage(key: string): string {
  const query = key.toLowerCase();
  let category = 'savings';
  if (query.includes('japon') || query.includes('japan')) category = 'japan';
  else if (query.includes('travel') || query.includes('viaje')) category = 'travel';
  else if (query.includes('house') || query.includes('casa')) category = 'home';
  else if (query.includes('car') || query.includes('auto')) category = 'car';

  const images = FALLBACK_IMAGES[category] ?? FALLBACK_IMAGES.savings;
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(index);
    hash |= 0;
  }
  return images[Math.abs(hash) % images.length];
}

export async function fetchUnsplashGoalImage(query: string): Promise<string> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return getDeterministicFallbackImage('savings');
  }

  try {
    const response = await apiClient.get<{ url: string }>('/images/search', {
      params: { query: refineQuery(cleanQuery) },
    });
    return response.data.url;
  } catch {
    return getDeterministicFallbackImage(cleanQuery);
  }
}
