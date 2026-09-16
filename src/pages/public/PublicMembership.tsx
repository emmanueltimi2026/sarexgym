import React from 'react';
import { ArrowRight, BadgeCheck, CreditCard, UserRoundCheck } from 'lucide-react';
import { FinalCta, PlanGrid, PublicPageHero, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';

export const PublicMembership: React.FC = () => {
  const { plans, navigate } = useGym();
  return (
    <div className="public-marketing-page">
        <PublicPageHero
          eyebrow="SAREX membership"
          title="Membership built around your goals"
          description="Choose the access, support, and training tools that fit your routine. Every active plan is managed through one secure member account."
          image="/assets/photos/photo-1517838277536-f5f99be501cd.jpg"
          imageAlt="SAREX member training in the gym"
        />
        <section className="public-section public-membership-page" aria-labelledby="plans-title">
          <div className="public-container">
            <SectionHeading id="plans-title" eyebrow="Available plans" title="Choose your membership" description="Prices and plan features shown here come directly from the active plans managed by the SAREX team." align="center" />
            <PlanGrid plans={plans} />
          </div>
        </section>
        <section className="public-section public-membership-process" aria-labelledby="membership-process-title">
          <div className="public-container public-split-copy">
            <SectionHeading id="membership-process-title" eyebrow="Straightforward from day one" title="Join now or create your account and pay later" description="You stay in control of when you activate your membership. Select a plan during registration for online payment, or complete registration first and choose from your portal." />
            <StaggerContainer className="public-process-list">
              <StaggerItem as="article"><UserRoundCheck aria-hidden="true" /><div><h3>Create a secure account</h3><p>Your profile gives you access to membership, payments, check-ins, events, and eligible workout features.</p></div></StaggerItem>
              <StaggerItem as="article"><CreditCard aria-hidden="true" /><div><h3>Pay securely or pay later</h3><p>Select an active plan for online checkout, or continue without a plan and activate your membership later.</p></div></StaggerItem>
              <StaggerItem as="article"><BadgeCheck aria-hidden="true" /><div><h3>Start with confirmed access</h3><p>Your portal displays your membership status and expiry so you always know when your gym access is active.</p></div></StaggerItem>
              <button className="public-primary-button" onClick={() => navigate('/register')}>Create member account <ArrowRight aria-hidden="true" /></button>
            </StaggerContainer>
          </div>
        </section>
        <FinalCta title="Find the membership that moves you forward" description="Review the plans above, create your account, and choose the right starting point for your fitness journey." />
    </div>
  );
};
