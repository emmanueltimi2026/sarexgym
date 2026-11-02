import { useEffect, useState } from 'react';
import { apiUrl } from '../../lib/secureFetch';
import { facilities } from './publicContent';

export type PublicService = {
  id: string; category: string; title: string; imageUrl: string; altText: string;
  shortDescription: string; fullDescription: string; features: string[]; sortOrder: number;
};

const fallbackServices: PublicService[] = facilities.map((item, index) => ({
  id: item.id, category: item.category, title: item.title, imageUrl: item.image, altText: item.altText,
  shortDescription: item.shortDescription, fullDescription: item.description, features: item.features, sortOrder: index
}));

export const usePublicServices = () => {
  const [services, setServices] = useState<PublicService[]>(fallbackServices);
  useEffect(() => {
    const controller = new AbortController();
    fetch(apiUrl('/api/v1/public/services'), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error?.message || 'Services unavailable');
        setServices(Array.isArray(body.data) ? body.data : []);
      })
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setServices(fallbackServices); });
    return () => controller.abort();
  }, []);
  return services;
};
