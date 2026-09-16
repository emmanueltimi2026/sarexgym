import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { FinalCta, PlanGrid, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { facilities, testimonials } from './publicContent';
import { PremiumImage, ScaleReveal, SlideUp, StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';

const workProcess = [
  {
    step: '01',
    title: 'Create your account',
    image: '/assets/photos/photo-1517838277536-f5f99be501cd.jpg',
    description: 'Set up your secure member profile so your membership, payments, visits, and eligible training tools stay in one place.'
  },
  {
    step: '02',
    title: 'Choose your membership',
    image: '/assets/photos/photo-1574680096145-d05b474e2155.jpg',
    description: 'Select the active plan that fits your routine and decide whether to pay online now or activate it later.'
  },
  {
    step: '03',
    title: 'Train and progress',
    image: '/assets/photos/photo-1549060279-7e168fcee0c2.jpg',
    description: 'Check in at reception, use your plan benefits, and stay connected to your fitness journey through the member portal.'
  }
];

export const PublicHome: React.FC = () => {
  const { navigate, plans } = useGym();
  const [bmiWeight, setBmiWeight] = useState('');
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiResult, setBmiResult] = useState<number | null>(null);

  const calculateBmi = (event: React.FormEvent) => {
    event.preventDefault();
    const weight = Number(bmiWeight);
    const heightInMetres = Number(bmiHeight) / 100;
    if (!weight || !heightInMetres) return;
    setBmiResult(Number((weight / (heightInMetres * heightInMetres)).toFixed(1)));
  };
  const bmiCategory = bmiResult === null ? '' : bmiResult < 18.5 ? 'Underweight' : bmiResult < 25 ? 'Healthy range' : bmiResult < 30 ? 'Overweight' : 'High range';

  return (
    <div className="public-marketing-page">
        <div className="public-hero-bmi-shell">
        <section className="public-home-hero" aria-labelledby="home-hero-title">
          <ScaleReveal as="div" className="public-home-hero-scene" aria-hidden="true" immediate duration={0.9} scale={1.04} />
          <div className="public-container public-home-hero-inner">
            <StaggerContainer as="div" className="public-home-hero-copy" immediate delay={0.08} stagger={0.09}>
              <StaggerItem as="p" className="public-eyebrow" distance={24} duration={0.5}>Fitness, wellness and recovery in Magboro</StaggerItem>
              <StaggerItem as="h1" id="home-hero-title" distance={58} duration={0.68}><span>Your fitness.</span><span>Your victory.</span></StaggerItem>
              <StaggerItem as="p" distance={34} duration={0.58}>Train, recover, and feel stronger with complete gym access, guided fitness, personal support, body massage, full-body spa services, and wellness programs built around real goals.</StaggerItem>
              <StaggerItem as="div" className="public-hero-actions" distance={30} duration={0.56}>
                <button className="public-primary-button" onClick={() => navigate('/register')}>Join SAREX <ArrowRight aria-hidden="true" /></button>
                <button className="public-secondary-button is-dark" onClick={() => navigate('/membership')}>Explore memberships</button>
              </StaggerItem>
              <StaggerItem as="div" className="public-hero-proof" aria-label="SAREX membership benefits" distance={22} duration={0.5}>
                <span><CheckCircle2 aria-hidden="true" />Structured support</span>
                <span><CheckCircle2 aria-hidden="true" />Training and recovery</span>
                <span><CheckCircle2 aria-hidden="true" />Simple member access</span>
              </StaggerItem>
            </StaggerContainer>
            <ScaleReveal as="img" className="public-home-hero-athlete" src="/assets/fitkit/hero_1_2.png" alt="SAREX member strength training with a dumbbell" fetchPriority="high" immediate delay={0.18} duration={0.74} distance={54} scale={0.95} />
          </div>
        </section>

        <section className="public-bmi-section" aria-labelledby="bmi-title">
          <div className="public-container">
            <SectionHeading id="bmi-title" eyebrow="Body mass index" title="Calculate Your BMI Now" align="center" light />
            <SlideUp as="form" className="public-bmi-form" onSubmit={calculateBmi} distance={14}>
              <label><span className="sr-only">Weight in kilograms</span><input type="number" min="30" max="250" step="0.1" required value={bmiWeight} onChange={event => setBmiWeight(event.target.value)} placeholder="Weight / KG" /></label>
              <label><span className="sr-only">Height in centimetres</span><input type="number" min="100" max="240" step="0.1" required value={bmiHeight} onChange={event => setBmiHeight(event.target.value)} placeholder="Height / CM" /></label>
              <output aria-live="polite">{bmiResult === null ? <span>This means</span> : <><small>{bmiCategory}</small><strong>{bmiResult}</strong></>}</output>
              <button className="public-primary-button" type="submit">Calculate now</button>
            </SlideUp>
            <p className="public-bmi-note">BMI is a general screening estimate and does not replace professional health advice.</p>
          </div>
        </section>
        </div>

        <section className="public-section public-work-process" aria-labelledby="work-process-title">
          <div className="public-container">
            <SectionHeading id="work-process-title" eyebrow="Work process" title="Easy steps to begin your journey" description="A simple route from creating your account to making SAREX part of your routine." align="center" />
            <StaggerContainer as="ol" className="public-process-circles">
              {workProcess.map(item => (
                <StaggerItem as="li" key={item.step} distance={72} duration={0.68}>
                  <div className="public-process-image"><PremiumImage src={item.image} alt="" loading="lazy" /><span>Step {item.step}</span></div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="public-section public-services-section" aria-labelledby="services-title">
          <div className="public-container">
            <div className="public-section-topline">
              <SectionHeading id="services-title" eyebrow="Services" title="Train hard. Recover well." description="From open-gym training to supported movement and restorative care, SAREX brings fitness and wellness together." />
              <button className="public-text-button" onClick={() => navigate('/facilities')}>Explore our facilities <ArrowRight aria-hidden="true" /></button>
            </div>
            <StaggerContainer className="public-service-grid public-service-reveal-grid" delay={0.08} stagger={0.14}>
              {facilities.map((service, index) => (
                <StaggerItem as="article" distance={112} duration={0.76} key={service.id} className="public-service-card" style={{ '--service-index': index } as React.CSSProperties}>
                  <div className="public-service-image-wrap">
                    <PremiumImage src={service.image} alt={`${service.title} at SAREX Fitness Clinic`} loading="lazy" />
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="public-service-card-copy"><small>{service.category}</small><h3>{service.title}</h3><p>{service.description}</p></div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>

        <section className="public-section public-membership-preview" aria-labelledby="membership-preview-title">
          <div className="public-container">
            <div className="public-section-topline">
              <SectionHeading id="membership-preview-title" eyebrow="Membership" title="A plan for the way you train" description="Check active SAREX memberships plans and choose the one that fit your routine." light />
              <button className="public-text-button is-light" onClick={() => navigate('/membership')}>View all plans <ArrowRight aria-hidden="true" /></button>
            </div>
            <PlanGrid plans={plans} limit={3} />
          </div>
        </section>

        <section className="public-section public-facility-preview" aria-labelledby="facility-preview-title">
          <div className="public-container public-split-feature">
            <SlideUp as="div" className="public-split-images" distance={96} duration={0.78} viewportAmount={0.24}>
              <ScaleReveal as="img" src="/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg" alt="SAREX strength training floor" loading="lazy" scale={0.94} distance={42} duration={0.72} />
              <ScaleReveal as="img" src="/assets/photos/full-body-spa.jfif" alt="Full-body spa service at SAREX" loading="lazy" delay={0.14} scale={0.9} distance={72} duration={0.78} />
            </SlideUp>
            <div>
              <SectionHeading id="facility-preview-title" eyebrow="Inside SAREX" title="One destination for strength and wellbeing" description="Move between focused training and thoughtful recovery in an environment designed to support long-term consistency." />
              <StaggerContainer as="ul" className="public-check-list">
                <StaggerItem as="li"><CheckCircle2 aria-hidden="true" /><span><strong>Purpose-built training areas</strong> for strength, cardio, conditioning, and guided sessions.</span></StaggerItem>
                <StaggerItem as="li"><CheckCircle2 aria-hidden="true" /><span><strong>Recovery and wellness services</strong> including body massage and full-body spa care.</span></StaggerItem>
                <StaggerItem as="li"><CheckCircle2 aria-hidden="true" /><span><strong>Support for different life stages</strong> with adaptable programs and maternal wellness sessions.</span></StaggerItem>
              </StaggerContainer>
              <button className="public-primary-button" onClick={() => navigate('/facilities')}>Explore the facilities <ArrowRight aria-hidden="true" /></button>
            </div>
          </div>
        </section>

        <section className="public-section public-testimonial-section" aria-labelledby="testimonials-title">
          <div className="public-container">
            <SectionHeading id="testimonials-title" eyebrow="Member experiences" title="What the SAREX community says" description="Impressions from people building stronger, healthier routines with us." align="center" light />
            <div className="review-carousel" aria-label="Member testimonials">
              <div className="review-track">
                {[...testimonials, ...testimonials].map(([name, review], index) => (
                  <article key={`${name}-${index}`} className="review-card" aria-hidden={index >= testimonials.length || undefined}>
                    <div className="public-stars" aria-label={index < testimonials.length ? '5 out of 5 stars' : undefined}>{Array.from({ length: 5 }, (_, star) => <Star key={star} aria-hidden="true" />)}</div>
                    <blockquote>“{review}”</blockquote>
                    <p>{name}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FinalCta />
    </div>
  );
};
