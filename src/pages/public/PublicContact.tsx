import React, { useState } from 'react';
import { Clock3, Mail, MapPin, Phone, Send } from 'lucide-react';
import { PublicPageHero, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { openingHours } from './publicContent';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';
import { apiUrl } from '../../lib/secureFetch';

export const PublicContact: React.FC = () => {
  const { settings } = useGym();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const phones = settings.phone.split(/\s*(?:\/|,|\n)\s*/).filter(Boolean);
  const mapQuery = encodeURIComponent(settings.address);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setSent(false);
    try {
      const response = await fetch(apiUrl('/api/v1/public/contact-messages'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error?.message || 'Your enquiry could not be sent. Please try again.');
      setForm({ name: '', email: '', phone: '', message: '' });
      setSent(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your enquiry could not be sent. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="public-marketing-page">
        <PublicPageHero
          eyebrow="Contact SAREX"
          title="Let’s talk about your next step"
          description="Ask about memberships, gym access, personal support, spa and massage services, or visiting the clinic."
          image="/assets/photos/photo-1518611012118-696072aa579a.jpg"
          imageAlt="Guided fitness session at SAREX Fitness Clinic"
        />
        <section className="public-section public-contact-section" aria-labelledby="contact-title">
          <div className="public-container">
            <SectionHeading id="contact-title" eyebrow="Get in touch" title="We are here to help" description="Reach the SAREX team directly or send an enquiry using the form." align="center" />
            <div className="public-contact-grid">
              <StaggerContainer className="public-contact-details">
                <StaggerItem as="a" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /><span><small>Visit us</small><strong>{settings.address}</strong></span></StaggerItem>
                <StaggerItem as="div"><Phone aria-hidden="true" /><span><small>Call us</small>{phones.map(phone => <a key={phone} href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a>)}</span></StaggerItem>
                <StaggerItem as="a" href={`mailto:${settings.email}`}><Mail aria-hidden="true" /><span><small>Email us</small><strong>{settings.email}</strong></span></StaggerItem>
                <StaggerItem as="div"><Clock3 aria-hidden="true" /><span><small>Opening hours</small>{openingHours.map(([day, hours]) => <span className="public-contact-hour" key={day}><b>{day}</b>{hours}</span>)}</span></StaggerItem>
              </StaggerContainer>
              <SlideUp as="form" className="public-contact-form" onSubmit={submit} delay={0.06}>
                <div><label htmlFor="contact-name">Full name</label><input id="contact-name" required autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div>
                <div><label htmlFor="contact-email">Email address</label><input id="contact-email" required type="email" autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></div>
                <div className="is-full"><label htmlFor="contact-phone">Phone number</label><input id="contact-phone" required type="tel" autoComplete="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} /></div>
                <div className="is-full"><label htmlFor="contact-message">How can we help?</label><textarea id="contact-message" required rows={6} value={form.message} onChange={event => setForm({ ...form, message: event.target.value })} /></div>
                <button className="public-primary-button is-full" type="submit" disabled={busy}>{busy ? 'Sending…' : sent ? 'Send another enquiry' : 'Send enquiry'} <Send aria-hidden="true" /></button>
                {error && <p className="is-full" role="alert">{error}</p>}
                {sent && <p className="is-full" role="status">Thanks for contacting SAREX. Your message has been sent to our team.</p>}
                <p className="is-full public-form-note">Your enquiry will be received by the SAREX admin and staff team.</p>
              </SlideUp>
            </div>
          </div>
        </section>
        <FadeIn as="section" className="public-map-section" aria-label="SAREX Fitness Clinic map">
          <span className="map-location-pulse" aria-hidden="true"><MapPin /></span>
          <iframe title="SAREX Fitness Clinic location" src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=17&ie=UTF8&iwloc=B&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </FadeIn>
    </div>
  );
};
