import React from 'react';
import { Clock3, MapPin, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { FinalCta, PublicPageHero, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { openingHours } from './publicContent';
import { ScaleReveal, SlideUp, StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';

export const PublicAbout: React.FC = () => {
  const { settings } = useGym();
  return (
    <div className="public-marketing-page">
        <PublicPageHero
          eyebrow="About SAREX"
          title="A stronger routine starts with the right environment"
          description="SAREX Fitness Clinic brings training, member support, wellness, and recovery together for people who want progress they can sustain."
          image="/assets/fitkit/about_1_2.png"
          imageAlt="SAREX Fitness Clinic training environment"
        />
        <section className="public-section public-story-section" aria-labelledby="story-title">
          <div className="public-container public-story-grid">
            <div><ScaleReveal as="img" src="/assets/fitkit/about_1_1.png" alt="A SAREX member training with a barbell" loading="lazy" /></div>
            <SlideUp as="div"><SectionHeading id="story-title" eyebrow="Our story" title="Fitness care that sees the whole person" description="SAREX was built to give the Magboro community a dependable place to train, recover, and make meaningful progress. Our approach connects capable facilities with practical guidance and a member experience that remains clear from registration to reception check-in." /><p>Whether your goal is strength, weight management, improved mobility, better fitness, or time to recover, the team helps you find a realistic way forward. The result is a clinic where serious training and thoughtful wellbeing belong in the same conversation.</p></SlideUp>
          </div>
        </section>
        <section className="public-section public-mission-section" aria-labelledby="mission-title">
          <div className="public-container">
            <SectionHeading id="mission-title" eyebrow="Mission and values" title="Progress that fits real life" description="We believe consistency grows when people feel supported, informed, and welcome." align="center" light />
            <StaggerContainer className="public-value-grid">
              <StaggerItem as="article" interactive><Target aria-hidden="true" /><h3>Purpose</h3><p>Training and wellness services should connect clearly to the outcome a member is working toward.</p></StaggerItem>
              <StaggerItem as="article" interactive><ShieldCheck aria-hidden="true" /><h3>Trust</h3><p>Professional support, transparent memberships, and reliable access create confidence at every visit.</p></StaggerItem>
              <StaggerItem as="article" interactive><Sparkles aria-hidden="true" /><h3>Whole-person care</h3><p>Strength, movement, recovery, and wellbeing work better when they are treated as one connected routine.</p></StaggerItem>
            </StaggerContainer>
          </div>
        </section>
        <section className="public-section public-visit-section" aria-labelledby="visit-title">
          <div className="public-container public-visit-grid">
            <div><SectionHeading id="visit-title" eyebrow="Plan your visit" title="Find us in Magboro" description="Visit the clinic, speak with the team, and get clear guidance on memberships, services, or your first training session." /><div className="public-location-line"><MapPin aria-hidden="true" /><span>{settings.address}</span></div></div>
            <SlideUp as="div" className="public-hours-panel" delay={0.06}><div className="public-hours-title"><Clock3 aria-hidden="true" /><h3>Opening hours</h3></div><dl>{openingHours.map(([day, hours]) => <div key={day}><dt>{day}</dt><dd>{hours}</dd></div>)}</dl></SlideUp>
          </div>
        </section>
        <FinalCta title="Build a routine you can keep" description="Join a fitness and wellness community designed to help you train consistently and recover with purpose." />
    </div>
  );
};
