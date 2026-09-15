import { useEffect } from 'react';
import type React from 'react';

type SeoProps = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
};

const siteName = 'SAREX Fitness Clinic';
const defaultImage = '/assets/fitkit/hero_1_2.png';

const absoluteUrl = (path: string) => {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_FRONTEND_URL;
  const origin = (configuredOrigin || window.location.origin).replace(/\/$/, '');
  return new URL(path, origin).toString();
};

const setMeta = (selector: string, attributes: Record<string, string>) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([name, value]) => element!.setAttribute(name, value));
};

const setLink = (rel: string, href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
};

export const Seo: React.FC<SeoProps> = ({ title, description, path, image = defaultImage, noindex = false, structuredData }) => {
  useEffect(() => {
    const fullTitle = title === siteName ? title : `${title} | ${siteName}`;
    const canonicalUrl = absoluteUrl(path);
    const imageUrl = absoluteUrl(image);
    document.title = fullTitle;

    setMeta('meta[name="description"]', { name: 'description', content: description });
    setMeta('meta[name="robots"]', { name: 'robots', content: noindex ? 'noindex,nofollow' : 'index,follow' });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: siteName });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: fullTitle });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: noindex ? 'profile' : 'website' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: fullTitle });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
    setLink('canonical', canonicalUrl);

    const scriptId = 'sarex-structured-data';
    document.getElementById(scriptId)?.remove();
    if (structuredData && !noindex) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [title, description, path, image, noindex, structuredData]);

  return null;
};
