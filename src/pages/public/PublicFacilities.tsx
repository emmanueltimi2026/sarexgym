import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Dumbbell, HeartPulse, Maximize2, Sparkles } from 'lucide-react';
import { FinalCta, PublicPageHero, SectionHeading } from '../../components/public/PublicSections';
import { useGym } from '../../context/GymContext';
import { facilities, galleryPhotos } from './publicContent';
import { PremiumImage, SlideUp, StaggerContainer, StaggerItem } from '../../components/public/PublicMotion';
import { Modal } from '../../components/ui/Modal';

export const PublicFacilities: React.FC = () => {
  const { navigate } = useGym();
  const galleryRailRef = useRef<HTMLDivElement>(null);
  const galleryPausedRef = useRef(false);
  const galleryHoveredRef = useRef(false);
  const galleryInteractingRef = useRef(false);
  const previewOpenRef = useRef(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const syncGalleryPause = () => {
    galleryPausedRef.current = galleryHoveredRef.current || galleryInteractingRef.current || previewOpenRef.current;
  };

  const openPreview = (index: number) => {
    previewOpenRef.current = true;
    syncGalleryPause();
    setPreviewIndex(index);
  };

  const closePreview = () => {
    previewOpenRef.current = false;
    syncGalleryPause();
    setPreviewIndex(null);
  };

  const showAdjacentImage = (direction: -1 | 1) => {
    setPreviewIndex(current => current === null ? 0 : (current + direction + galleryPhotos.length) % galleryPhotos.length);
  };

  useEffect(() => {
    if (previewIndex === null) return;
    const handlePreviewKeys = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') showAdjacentImage(-1);
      if (event.key === 'ArrowRight') showAdjacentImage(1);
    };
    window.addEventListener('keydown', handlePreviewKeys);
    return () => window.removeEventListener('keydown', handlePreviewKeys);
  }, [previewIndex]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let previous = performance.now();
    let direction = 1;
    let position = galleryRailRef.current?.scrollLeft ?? 0;
    let renderedPosition = position;
    const pixelsPerSecond = 18;

    const animateGallery = (timestamp: number) => {
      const rail = galleryRailRef.current;
      if (rail) {
        const maxScroll = rail.scrollWidth - rail.clientWidth;
        const manuallyMoved = Math.abs(rail.scrollLeft - renderedPosition) > 1;

        if (manuallyMoved || galleryPausedRef.current) {
          position = rail.scrollLeft;
          renderedPosition = rail.scrollLeft;
        } else if (maxScroll > 1 && document.visibilityState === 'visible') {
          const elapsed = Math.min((timestamp - previous) / 1000, 0.05);
          position += elapsed * pixelsPerSecond * direction;

          if (position >= maxScroll) {
            position = maxScroll;
            direction = -1;
          } else if (position <= 0) {
            position = 0;
            direction = 1;
          }

          rail.scrollLeft = position;
          renderedPosition = rail.scrollLeft;
        }
      }
      previous = timestamp;
      frame = window.requestAnimationFrame(animateGallery);
    };

    frame = window.requestAnimationFrame(animateGallery);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="public-marketing-page">
        <PublicPageHero
          eyebrow="Training and wellness"
          title="Built for the work. Ready for recovery."
          description="Explore practical training areas, guided fitness services, and restorative wellness care within one SAREX experience."
          image="/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg"
          imageAlt="Strength equipment on the SAREX training floor"
        />
        <section className="public-section public-facility-intro" aria-labelledby="facility-categories-title">
          <div className="public-container">
            <SectionHeading id="facility-categories-title" eyebrow="Facility categories" title="Everything has a purpose" description="Each area and service supports a different part of a sustainable fitness routine: training, guided movement, or recovery." align="center" />
            <StaggerContainer className="public-category-grid">
              <StaggerItem as="article" interactive><Dumbbell aria-hidden="true" /><h3>Train</h3><p>Free weights, resistance work, cardio, conditioning, and open-gym sessions.</p></StaggerItem>
              <StaggerItem as="article" interactive><HeartPulse aria-hidden="true" /><h3>Move</h3><p>Aerobics, core training, personal support, and adaptable guided movement.</p></StaggerItem>
              <StaggerItem as="article" interactive><Sparkles aria-hidden="true" /><h3>Recover</h3><p>Body massage, full-body spa care, relaxation, and post-training recovery.</p></StaggerItem>
            </StaggerContainer>
          </div>
        </section>
        <section className="public-section public-facility-list" aria-labelledby="facility-list-title">
          <div className="public-container">
            <SectionHeading id="facility-list-title" eyebrow="Areas and services" title="Explore the SAREX experience" description="A closer look at the spaces and support available to members and wellness clients." />
            <div className="public-facility-rows">
              {facilities.map((facility, index) => (
                <SlideUp as="article" distance={90} duration={0.68} delay={Math.min(index * 0.035, 0.14)} key={facility.id} className={index % 2 ? 'is-reversed' : ''}>
                  <PremiumImage src={facility.image} alt={`${facility.title} at SAREX Fitness Clinic`} loading="lazy" />
                  <div><small>{facility.category}</small><h3>{facility.title}</h3><p>{facility.description}</p><ul>{facility.features.map(feature => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}</ul><button className="public-text-button" onClick={() => navigate('/contact')}>Ask about this service <ArrowRight aria-hidden="true" /></button></div>
                </SlideUp>
              ))}
            </div>
          </div>
        </section>
        <section className="public-section public-gallery-section" aria-labelledby="gallery-title">
          <div className="public-container">
            <SectionHeading id="gallery-title" eyebrow="Inside the clinic" title="A closer look at SAREX" description="Training, movement, and the people who make the space feel alive." align="center" light />
            <div
              ref={galleryRailRef}
              className="public-gallery-rail gallery-rail"
              aria-label="SAREX Fitness Clinic gallery"
              onFocus={() => { galleryInteractingRef.current = true; syncGalleryPause(); }}
              onBlur={() => { galleryInteractingRef.current = false; syncGalleryPause(); }}
              onPointerDown={() => { galleryInteractingRef.current = true; syncGalleryPause(); }}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') {
                  galleryHoveredRef.current = true;
                  syncGalleryPause();
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') {
                  galleryHoveredRef.current = false;
                  galleryInteractingRef.current = false;
                  syncGalleryPause();
                }
              }}
              onPointerUp={() => { galleryInteractingRef.current = false; syncGalleryPause(); }}
              onPointerCancel={() => { galleryInteractingRef.current = false; syncGalleryPause(); }}
            >
              <div className="public-gallery-auto-track gallery-auto-track">
                <div className="public-gallery-sequence gallery-sequence">
                  {galleryPhotos.map((photo, index) => (
                    <button
                      aria-label={`Preview SAREX Fitness Clinic facility image ${index + 1}`}
                      className={`public-gallery-tile gallery-tile ${index % 5 === 0 ? 'gallery-tile-wide' : ''}`}
                      key={photo}
                      onClick={() => openPreview(index)}
                      type="button"
                    >
                      <PremiumImage alt={`SAREX Fitness Clinic facility view ${index + 1}`} loading="lazy" src={photo} />
                      <span aria-hidden="true"><Maximize2 /></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
        <Modal isOpen={previewIndex !== null} onClose={closePreview} title="Inside SAREX" subtitle={previewIndex === null ? undefined : `Image ${previewIndex + 1} of ${galleryPhotos.length}`} maxWidth="2xl">
          {previewIndex !== null && (
            <div className="public-gallery-preview">
              <img src={galleryPhotos[previewIndex]} alt={`SAREX Fitness Clinic gallery preview ${previewIndex + 1}`} />
              <div className="public-gallery-preview-controls">
                <button type="button" onClick={() => showAdjacentImage(-1)} aria-label="Show previous gallery image"><ChevronLeft /></button>
                <span>{previewIndex + 1} / {galleryPhotos.length}</span>
                <button type="button" onClick={() => showAdjacentImage(1)} aria-label="Show next gallery image"><ChevronRight /></button>
              </div>
            </div>
          )}
        </Modal>
        <FinalCta eyebrow="Come see the space" title="Visit SAREX and find your starting point" description="Speak with our team about gym access, guided training, spa services, or the right membership for you." />
    </div>
  );
};
