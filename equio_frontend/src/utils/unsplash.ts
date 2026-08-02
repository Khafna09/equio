type UnsplashSearchResponse = {
  results?: Array<{
    urls?: {
      regular?: string;
      small?: string;
    };
  }>;
};

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

function getRefinedSearchQuery(rawQuery: string): string {
  let q = rawQuery.trim();
  if (!q) return 'savings money';
  q = q.replace(/\bviaje a\b/gi, 'travel')
       .replace(/\bviaje\b/gi, 'travel')
       .replace(/\bvacaciones en\b/gi, 'vacation')
       .replace(/\bvacaciones\b/gi, 'vacation')
       .replace(/\bcasa\b/gi, 'house')
       .replace(/\bcarro\b|\bauto\b|\bcoche\b/gi, 'car')
       .replace(/\bfondo de emergencia\b/gi, 'emergency fund savings')
       .replace(/\bahorro\b/gi, 'savings');
  return q;
}

export function getDeterministicFallbackImage(key: string): string {
  const q = key.toLowerCase();
  let category = 'savings';
  if (q.includes('japon') || q.includes('japan')) category = 'japan';
  else if (q.includes('travel') || q.includes('viaje') || q.includes('peru') || q.includes('brasil')) category = 'travel';
  else if (q.includes('house') || q.includes('casa') || q.includes('hogar')) category = 'home';
  else if (q.includes('car') || q.includes('auto') || q.includes('carro')) category = 'car';

  const list = FALLBACK_IMAGES[category] || FALLBACK_IMAGES.savings;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % list.length;
  return list[index];
}

export async function fetchUnsplashGoalImage(query: string): Promise<string> {
  const accessKey = import.meta.env.VITE_UNSPLASH_ACCESS_KEY;
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return getDeterministicFallbackImage('savings');
  }

  const refinedQuery = getRefinedSearchQuery(cleanQuery);

  if (accessKey) {
    try {
      const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(refinedQuery)}&orientation=landscape&per_page=5&client_id=${accessKey}`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = (await res.json()) as UnsplashSearchResponse;
        if (data.results && data.results.length > 0) {
          const img = data.results[0]?.urls?.regular || data.results[0]?.urls?.small;
          if (img) return img;
        }
      }
    } catch (e) {
      console.warn('Unsplash API search error, using fallback:', e);
    }
  }

  return getDeterministicFallbackImage(cleanQuery);
}