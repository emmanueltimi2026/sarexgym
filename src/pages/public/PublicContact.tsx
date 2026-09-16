import React, { useState } from 'react';
import { Clock3, Mail, MapPin, Phone, Send } from 'lucide-react';
import { PublicPageHero, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { openingHours } from './publicContent';
import { FadeIn, SlideUp, StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';

export const PublicContact: React.FC = () => {
  const { settings } = useGym();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const phones = settings.phone.split(/\s*(?:\/|,|\n)\s*/).filter(Boolean);
  const mapQuery = encodeURIComponent(settings.address);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Website enquiry from ${form.name}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\n${form.message}`);
    window.location.href = `mailto:${settings.email}?subject=${subject}&body=${body}`;
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
                <button className="public-primary-button is-full" type="submit">Send enquiry <Send aria-hidden="true" /></button>
                <p className="is-full public-form-note">Submitting opens your email app with the enquiry addressed to SAREX. Your message is not stored by this website.</p>
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
