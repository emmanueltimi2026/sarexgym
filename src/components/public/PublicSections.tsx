import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import type { MembershipPlan } from '../../types';
import { useGym } from '../../context/GymContext';
import { PremiumImage, SlideUp, StaggerContainer, StaggerItem } from './PublicMotion';

export const SectionHeading: React.FC<{
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
  align?: 'left' | 'center';
  light?: boolean;
}> = ({ eyebrow, title, description, id, align = 'left', light = false }) => (
  <SlideUp as="div" className={`public-section-heading ${align === 'center' ? 'is-centered' : ''}`} distance={16}>
    <p className="public-eyebrow">{eyebrow}</p>
    <h2 id={id} className={light ? 'text-white' : 'text-[#111111]'}>{title}</h2>
    {description && <p className={light ? 'text-neutral-400' : 'text-[#626268]'}>{description}</p>}
  </SlideUp>
);

export const PublicPageHero: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
}> = ({ eyebrow, title, description, image, imageAlt }) => (
  <section className="public-page-hero">
    <PremiumImage src={image} alt={imageAlt} className="public-page-hero-image" fetchPriority="high" revealScale={1.025} />
    <div className="public-page-hero-overlay" aria-hidden="true" />
    <StaggerContainer as="div" className="public-container public-page-hero-content" immediate delay={0.08} stagger={0.1}>
      <StaggerItem as="p" className="public-eyebrow" distance={22} duration={0.5}>{eyebrow}</StaggerItem>
      <StaggerItem as="h1" distance={52} duration={0.66}>{title}</StaggerItem>
      <StaggerItem as="p" distance={30} duration={0.56}>{description}</StaggerItem>
    </StaggerContainer>
  </section>
);

export const PlanGrid: React.FC<{ plans: MembershipPlan[]; limit?: number; stacked?: boolean }> = ({ plans, limit, stacked = false }) => {
  const { navigate } = useGym();
  const activePlans = plans.filter(plan => plan.isActive !== false && plan.status !== 'inactive');
  const visiblePlans = typeof limit === 'number' ? activePlans.slice(0, limit) : activePlans;

  if (!visiblePlans.length) {
    return <div className="public-empty-state">Membership plans are being updated. Please contact the SAREX team for current options.</div>;
  }

  return (
    <StaggerContainer className={`public-plan-grid ${stacked ? 'is-stacked' : ''}`}>
      {visiblePlans.map((plan, index) => (
        <StaggerItem
          as="article"
          distance={72}
          duration={0.66}
          interactive
          hoverDistance={9}
          hoverScale={1.012}
          className={`public-plan-card ${index === 1 ? 'is-featured' : ''}`}
          style={stacked ? { '--plan-index': index } as React.CSSProperties : undefined}
          key={plan.id}
        >
          <div className="public-plan-card-top">
            <span>{String(index + 1).padStart(2, '0')}</span>
            {index === 1 && <strong>Popular choice</strong>}
          </div>
          <div className="public-plan-card-body">
            <div className="public-plan-card-copy">
              <h3>{plan.name}</h3>
              <p className="public-plan-description">{plan.description}</p>
              <div className="public-plan-price">
                <span>₦{plan.price.toLocaleString()}</span>
                <small>/{plan.durationDays === 1 ? 'day' : `${plan.durationDays} days`}</small>
              </div>
              {Boolean(plan.registrationFee) && <p className="public-plan-fee">Registration fee: ₦{(plan.registrationFee || 0).toLocaleString()}</p>}
            </div>
            <ul>
              {plan.features.map(feature => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}
              {plan.trainerAccess && <li><Check aria-hidden="true" />Trainer access</li>}
              {plan.workoutPlanAccess && <li><Check aria-hidden="true" />Workout plan access</li>}
            </ul>
          </div>
          <button className="public-primary-button" onClick={() => navigate(`/register?plan=${encodeURIComponent(plan.id)}`)}>
            Choose this plan <ArrowRight aria-hidden="true" />
          </button>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
};

export const FinalCta: React.FC<{
  eyebrow?: string;
  title?: string;
  description?: string;
}> = ({
  eyebrow = 'Your next chapter starts here',
  title = 'Ready to train with purpose?',
  description = 'Choose a membership that fits your goals and become part of the SAREX community today.'
}) => {
  const { navigate } = useGym();
  return (
    <section className="public-final-cta">
      <SlideUp as="div" className="public-container public-final-cta-inner" distance={18}>
        <div>
          <p className="public-eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="public-final-cta-actions">
          <button className="public-primary-button" onClick={() => navigate('/register')}>Join SAREX <ArrowRight aria-hidden="true" /></button>
          <button className="public-secondary-button is-dark" onClick={() => navigate('/contact')}>Talk to our team</button>
        </div>
      </SlideUp>
    </section>
  );
};
