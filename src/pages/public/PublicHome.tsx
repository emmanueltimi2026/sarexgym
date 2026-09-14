import React, { useEffect, useRef, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { PublicLayout } from '../../components/public/PublicLayout';
import { Modal } from '../../components/ui/Modal';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Star,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

export const PublicHome: React.FC = () => {
  const { navigate, plans, settings } = useGym();
  const publicPhones = settings.phone.split(/\s*(?:\/|,|\n)\s*/).filter(Boolean);
  const mapQuery = encodeURIComponent(settings.address);
  const homepageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = homepageRef.current;
    if (!root || !('IntersectionObserver' in window)) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        if (reducedMotion.matches) return;
        const content = entry.target.querySelector<HTMLElement>(':scope > div:not([aria-hidden="true"])');
        if (!content || content.contains(document.activeElement)) return;
        const animation = content.animate(
          [
            { transform: 'translateY(64px)' },
            { transform: 'translateY(0)' }
          ],
          { duration: 2200, easing: 'cubic-bezier(0.18, 0.72, 0.24, 1)', fill: 'both' }
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -70px 0px' });
    root.querySelectorAll('section').forEach(section => observer.observe(section));
    const cancelAnimations = () => {
      animations.forEach(animation => animation.cancel());
      animations.clear();
    };
    const handleMotionChange = () => { if (reducedMotion.matches) cancelAnimations(); };
    reducedMotion.addEventListener('change', handleMotionChange);
    root.addEventListener('focusin', cancelAnimations);
    return () => {
      observer.disconnect();
      cancelAnimations();
      reducedMotion.removeEventListener('change', handleMotionChange);
      root.removeEventListener('focusin', cancelAnimations);
    };
  }, []);

  useEffect(() => {
    const athlete = homepageRef.current?.querySelector<HTMLElement>('.hero-member');
    if (!athlete || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const update = () => { frame = 0; athlete.style.setProperty('--hero-shift', `${Math.min(window.scrollY * 0.12, 62)}px`); };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update(); window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); if (frame) cancelAnimationFrame(frame); };
  }, []);

  const [bmiWeight, setBmiWeight] = useState<number>(0);
  const [bmiHeight, setBmiHeight] = useState<number>(0);
  const [bmiAge, setBmiAge] = useState<number>(0);
  const [bmiSex, setBmiSex] = useState<'Male' | 'Female'>('Male');
  const [bmiActivity, setBmiActivity] = useState<string>('Moderate');
  const [bmiResult, setBmiResult] = useState<{ bmi: number } | null>(null);
  const handleCalculateBMI = (e: React.FormEvent) => {
    e.preventDefault();
    if (bmiWeight < 30 || bmiWeight > 250 || bmiHeight < 100 || bmiHeight > 240 || bmiAge < 18 || bmiAge > 100) return;
    setBmiResult({ bmi: Number((bmiWeight / (bmiHeight / 100) ** 2).toFixed(1)) });
  };

  const fitnessClasses = [
    {
      id: 'gym', title: 'Gym', category: 'Open Training', intensity: 'All Levels', duration: 'Flexible', calories: 'Goal based', trainer: 'Floor Training Team', schedule: 'Daily',
      image: '/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg',
      description: 'A complete training floor for strength, cardiovascular fitness, mobility, and independently guided workouts.'
    },
    {
      id: 'aerobics', title: 'Aerobics Class', category: 'Group Fitness', intensity: 'Moderate–High', duration: '60 Mins', calories: 'Cardio focused', trainer: 'Aerobics Instructor', schedule: 'Scheduled classes',
      image: '/assets/photos/photo-1518611012118-696072aa579a.jpg',
      description: 'Instructor-led rhythmic cardio sessions that improve stamina, coordination, mobility, and cardiovascular health.'
    },
    {
      id: 'spa', title: 'Full Body Spa', category: 'Wellness & Recovery', intensity: 'Restorative', duration: 'By appointment', calories: 'Recovery', trainer: 'Spa Therapist', schedule: 'Book ahead',
      image: '/assets/photos/full-body-spa.jfif',
      description: 'A restorative full-body wellness experience designed to reduce tension, support recovery, and improve relaxation.'
    },
    {
      id: 'pregnancy', title: 'Pregnancy & After Birth', category: 'Maternal Wellness', intensity: 'Low–Moderate', duration: '45 Mins', calories: 'Personalized', trainer: 'Women’s Wellness Trainer', schedule: 'By consultation',
      image: '/assets/photos/pregnancy.jpg',
      description: 'Carefully adapted prenatal and postnatal movement sessions focused on mobility, strength, recovery, and confidence.'
    },
    {
      id: 'muscle-tone', title: 'Muscle Tone', category: 'Strength & Conditioning', intensity: 'Moderate', duration: '60 Mins', calories: 'Goal based', trainer: 'Fitness Trainer', schedule: 'Personal or group',
      image: '/assets/photos/photo-1534367507873-d2d7e24c797f.jpg',
      description: 'Progressive resistance sessions that build definition, functional strength, posture, and muscular endurance.'
    },
    {
      id: 'weight-loss', title: 'Weight Loss', category: 'Body Transformation', intensity: 'Personalized', duration: 'Program based', calories: 'Tracked', trainer: 'Transformation Trainer', schedule: 'Assessment required',
      image: '/assets/photos/photo-1574680096145-d05b474e2155.jpg',
      description: 'Structured exercise, progress tracking, and sustainable training built around your starting point and weight-loss goals.'
    },
    {
      id: 'massage', title: 'Body Massage', category: 'Therapeutic Recovery', intensity: 'Restorative', duration: 'By appointment', calories: 'Recovery', trainer: 'Massage Therapist', schedule: 'Book ahead',
      image: '/assets/photos/massage.jfif',
      description: 'Professional massage sessions for relaxation, muscular tension relief, circulation, and post-training recovery.'
    },
    {
      id: 'abdominal', title: 'Abdominal Exercise', category: 'Core Conditioning', intensity: 'All Levels', duration: '30–45 Mins', calories: 'Conditioning', trainer: 'Core Fitness Trainer', schedule: 'Scheduled sessions',
      image: '/assets/photos/ab.jfif',
      description: 'Focused core training that improves abdominal strength, stability, posture, and control through progressive movement.'
    }
  ];

  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const loadEvents = (attempt = 0) => fetch(`${base}/api/v1/public/events`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Event feed unavailable')))
      .then(body => setUpcomingEvents(body.data || []))
      .catch(() => {
        if (attempt < 2) window.setTimeout(() => loadEvents(attempt + 1), 900);
        else setUpcomingEvents([]);
      });
    const reloadEvents = () => { void loadEvents(); };
    loadEvents();
    addEventListener('focus', reloadEvents);
    return () => removeEventListener('focus', reloadEvents);
  }, []);

  return (
    <PublicLayout>

      <div className="reference-home" ref={homepageRef}>
      <div className="hero-bmi-shell">
        <section className="reference-hero" aria-labelledby="hero-title">
          <div className="hero-scene" aria-hidden="true" />
          <div className="reference-container hero-inner">
            <div className="hero-copy">
              <p className="section-eyebrow">Keep your body fitness with workouts</p>
              <h1 id="hero-title"><span>YOUR FITNESS</span><span>YOUR VICTORY</span></h1>
              <p className="hero-description">Train, recover, and feel stronger at SAREX Fitness Clinic with gym access, fitness classes, personal support, body massage, full body spa services, and wellness programs for every goal.</p>
              <div className="hero-actions">
                <button className="reference-button hero-access-button" onClick={() => navigate('/register')}>Join or sign in</button>
              </div>
            </div>
            <img className="hero-member" src="/assets/fitkit/hero_1_2.png" alt="Member curling a dumbbell" fetchPriority="high" />
          </div>
        </section>
        <section className="reference-bmi" aria-labelledby="bmi-title">
          <div className="reference-container">
            <p className="section-eyebrow centered">Body mass index</p>
            <h2 id="bmi-title">Calculate Your BMI Now</h2>
            <form className="bmi-grid" onSubmit={handleCalculateBMI}>
              <input aria-label="Weight in kilograms" type="number" min="30" max="250" placeholder="Weight / KG" required value={bmiWeight || ''} onChange={e => setBmiWeight(Number(e.target.value))} />
              <input aria-label="Height in centimeters" type="number" min="100" max="240" placeholder="Height / CM" required value={bmiHeight || ''} onChange={e => setBmiHeight(Number(e.target.value))} />
              <input aria-label="Age" type="number" min="18" max="100" placeholder="Age" required value={bmiAge || ''} onChange={e => setBmiAge(Number(e.target.value))} />
              <select aria-label="Sex" value={bmiSex} onChange={e => setBmiSex(e.target.value as 'Male' | 'Female')}><option value="Male">Male</option><option value="Female">Female</option></select>
              <select className="bmi-activity" aria-label="BMI activity factor" value={bmiActivity} onChange={e => setBmiActivity(e.target.value)}><option value="Moderate">BMI Activity Factor</option><option value="Sedentary">Sedentary</option><option value="Heavy">Active</option><option value="Member">Very active</option></select>
              <output className="bmi-output" aria-live="polite">{bmiResult ? 'BMI: ' + bmiResult.bmi : 'This Means'}</output>
              <button className="reference-button" type="submit">Calculate now</button>
            </form>
          </div>
        </section>
      </div>
      <section id="about-section" className="reference-about">
        <div className="reference-container about-grid">
          <div>
            <p className="section-eyebrow">About us</p>
            <h2>We Have Lot Of Experience<br />Gym Training</h2>
            <div className="about-details">
              <img src="/assets/fitkit/about_1_2.png" alt="Weight training at the gym" loading="lazy" />
              <div><p>Many individuals benefit from personalized workout plans designed by fitness professionals or personal trainers to address specific fitness goals, such as muscle gain, weight loss, or improved athletic performance.</p>
                <ul><li>Over 15 years of experience</li><li>Certified Trainers</li><li>Exceptional work quality</li></ul>
                <button className="reference-button" onClick={() => navigate('/register')}>Get started</button>
              </div>
            </div>
          </div>
          <img className="about-member" src="/assets/fitkit/about_1_1.png" alt="Member training with a barbell" loading="lazy" />
        </div>
      </section>

      <section className="py-24 bg-[#F9FAFB] text-[#111111] border-t border-b border-gray-200 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="w-8 h-[2px] bg-[#EF1B23]" />
              <span className="text-xs font-black uppercase tracking-widest text-[#EF1B23]">
                WORK PROCESS
              </span>
              <span className="w-8 h-[2px] bg-[#EF1B23]" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-[#111111]">
              Easy Step To Achieve Your Goals.
            </h2>
          </div>

          <div className="motion-stagger grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="text-center flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="w-44 h-44 rounded-full p-2 border-2 border-dashed border-[#EF1B23] group-hover:rotate-45 transition-transform duration-500">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src="/assets/photos/photo-1517838277536-f5f99be501cd.jpg"
                      alt="Gym Movement"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[#EF1B23] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  STEP 01
                </div>
              </div>

              <h3 className="text-xl font-black uppercase text-[#111111] mb-2 tracking-wide">
                Gym Movement
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed max-w-xs">
                Many gyms offer tools and resources to track progress, such as fitness apps, workout logs, or integrated gym software.
              </p>
            </div>

            <div className="text-center flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="w-44 h-44 rounded-full p-2 border-2 border-dashed border-[#EF1B23] group-hover:rotate-45 transition-transform duration-500">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src="/assets/photos/photo-1574680096145-d05b474e2155.jpg"
                      alt="Fitness Practice"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[#EF1B23] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  STEP 02
                </div>
              </div>

              <h3 className="text-xl font-black uppercase text-[#111111] mb-2 tracking-wide">
                Fitness Practice
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed max-w-xs">
                Gyms are adaptable to various fitness levels and preferences, catering to beginners and advanced individuals alike.
              </p>
            </div>

            <div className="text-center flex flex-col items-center group">
              <div className="relative mb-6">
                <div className="w-44 h-44 rounded-full p-2 border-2 border-dashed border-[#EF1B23] group-hover:rotate-45 transition-transform duration-500">
                  <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
                    <img
                      src="/assets/photos/photo-1549060279-7e168fcee0c2.jpg"
                      alt="Achievement"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-[#EF1B23] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">
                  STEP 03
                </div>
              </div>

              <h3 className="text-xl font-black uppercase text-[#111111] mb-2 tracking-wide">
                Achievement
              </h3>
              <p className="text-xs text-[#6B7280] leading-relaxed max-w-xs">
                Group fitness classes led by instructors offer structured workouts in a motivating group setting for development.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="classes-section" className="py-24 bg-[#FFFFFF] text-[#111111]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-12 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-8 h-[2px] bg-[#EF1B23]" />
                <span className="text-xs font-black uppercase tracking-widest text-[#EF1B23]">
                  GYM & FITNESS TRAINING
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-[#111111]">
                Services Built Around Your Goals
              </h2>
            </div>

          </div>

          <div className="stacked-service-list">
            {fitnessClasses.map((cls,index) => <article key={cls.id} className="stacked-service-card" style={{'--service-index':index} as React.CSSProperties}>
              <div className="stacked-service-header">
                <span>{String(index+1).padStart(2,'0')}</span><div><small>{cls.category}</small><h3>{cls.title}</h3></div><strong>{cls.intensity}</strong><ChevronRight className="service-chevron"/>
              </div>
              <div className="stacked-service-body">
                <div className="stacked-service-image"><img src={cls.image} alt={cls.title} loading="lazy"/><span>{cls.intensity} intensity</span></div>
                <div className="stacked-service-copy"><p>{cls.description}</p><dl><div><dt>Duration</dt><dd>{cls.duration}</dd></div><div><dt>Focus</dt><dd>{cls.calories}</dd></div><div><dt>Trainer</dt><dd>{cls.trainer}</dd></div><div><dt>Availability</dt><dd>{cls.schedule}</dd></div></dl><div className="flex flex-wrap gap-3"><button className="reference-button" onClick={()=>document.getElementById('contact-section')?.scrollIntoView({behavior:'smooth'})}>Enquire about service</button><button className="service-schedule-button" onClick={()=>document.getElementById('schedule-section')?.scrollIntoView({behavior:'smooth'})}>View upcoming events</button></div></div>
              </div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="schedule-section" className="bg-[#0d0d0d] py-24 text-white border-t border-neutral-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center"><p className="section-eyebrow centered">SAREX community</p><h2 className="text-3xl font-black uppercase tracking-tight sm:text-5xl">Upcoming events</h2></div>
          {upcomingEvents.length ? <div className="motion-stagger grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcomingEvents.slice(0,6).map(event=><article key={event.id} className="overflow-hidden rounded-2xl border border-neutral-800 bg-[#171717] shadow-lg transition hover:-translate-y-2">{event.image_url?<img src={event.image_url} loading="lazy" alt={event.title} className="h-48 w-full object-cover"/>:<div className="h-2 bg-[#EF1B23]"/>}<div className="p-6"><div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#EF1B23]"><span>{new Date(event.starts_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</span><span>{Number(event.price_minor)?`₦${(Number(event.price_minor)/100).toLocaleString()}`:'Free'}</span></div><h3 className="mt-3 text-2xl font-black">{event.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">{event.description}</p><div className="mt-5 flex items-center gap-2 text-xs text-gray-400"><MapPin className="h-4 w-4 text-[#EF1B23]"/>{event.location}</div><div className="mt-6 flex flex-wrap items-center gap-4"><button onClick={()=>navigate(`/events/${event.id}`)} className="inline-flex items-center gap-2 rounded-lg bg-[#EF1B23] px-4 py-2.5 text-xs font-black uppercase text-white">View details <ArrowRight className="h-4 w-4"/></button><button onClick={()=>navigate('/login')} className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#EF1B23]">Sign in to reserve</button></div></div></article>)}</div> : <div className="rounded-2xl border border-neutral-800 bg-[#171717] px-6 py-12 text-center text-sm text-gray-400">No upcoming events have been published yet.</div>}
        </div>
      </section>

      <section className="reference-workout">
        <div className="reference-container workout-grid">
          <div><p className="section-eyebrow">Build your strongest self</p><h2>Invigorating Fitness Workout<br />For Body And Mind!</h2><p>Make time for your strength, energy, and wellbeing. Explore guided training, free weights, and fitness classes that support your goals.</p><button className="reference-button" onClick={() => document.getElementById('pricing-section')?.scrollIntoView({behavior:'smooth'})}>Explore memberships</button></div>
          <div className="workout-photos"><img src="/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg" alt="Strength training with free weights" loading="lazy" /><img src="/assets/photos/photo-1518611012118-696072aa579a.jpg" alt="Guided fitness workout" loading="lazy" /></div>
        </div>
      </section>
      <section className="home-gallery bg-[#111] py-24 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="section-eyebrow text-center">Inside SAREX</p>
          <h2 className="mb-10 text-center text-4xl font-black uppercase sm:text-5xl">Train. Recover. Transform.</h2>
          <div className="gallery-motion gallery-rail">
            {['photo-1517838277536-f5f99be501cd.jpg','photo-1549060279-7e168fcee0c2.jpg','photo-1574680096145-d05b474e2155.jpg','photo-1581009146145-b5ef050c2e1e.jpg','photo-1518611012118-696072aa579a.jpg','photo-1534367507873-d2d7e24c797f.jpg','photo-1492562080023-ab3db95bfbce.jpg','photo-1500648767791-00dcc994a43e.jpg','photo-1506794778202-cad84cf45f1d.jpg','photo-1507003211169-0a1dd7228f2d.jpg','photo-1519085360753-af0119f7cbe7.jpg','images.jfif'].map((photo,index)=>{const src='/assets/photos/'+photo;return <button key={photo} type="button" onClick={()=>setPreviewImage(src)} className={'gallery-tile group relative snap-start overflow-hidden rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#EF1B23]/40 '+(index%5===0?'gallery-tile-wide':'')}><img loading="lazy" src={src} alt={`SAREX Fitness Clinic gallery view ${index+1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-110"/><div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15"/></button>})}
          </div>
        </div>
      </section>


      <section id="pricing-section" className="reference-pricing stacked-pricing">
        <div className="reference-container max-w-4xl">
          <p className="section-eyebrow text-center">Membership plans</p>
          <h2 className="text-center">Find Your Perfect Plan</h2>
          <div className="stacked-plan-list">{plans.map((plan,index) => <article className="stacked-plan-card" style={{top:96+index*54,zIndex:index+1}} key={plan.id}>
            <header><span>0{index+1}</span><h3>{plan.name}</h3><div><strong>₦{plan.price.toLocaleString()}</strong><small> / {plan.durationDays === 1 ? 'day' : plan.durationDays + ' days'}</small></div></header>
            <div className="stacked-plan-body"><p>{plan.description}</p><ul>{plan.features.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul><button className="reference-button" onClick={() => navigate('/register')}>Choose plan <ArrowRight size={16}/></button></div>
          </article>)}</div>
        </div>
      </section>

      <section className="reference-testimonials bg-white py-24 text-[#111111]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="section-eyebrow text-center">Testimonials</p>
            <h2 className="text-4xl font-black uppercase sm:text-5xl">Member Feedback</h2>
            <p className="mt-4 text-sm leading-6 text-[#6B7280]">Real experiences from members who train, grow, and feel at home at SAREX Fitness Clinic.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              ['Samuel Ojo', 'The coaches pay attention to technique and progress. Every session feels purposeful, and I have become much stronger and more confident.'],
              ['Bola Taju', 'The atmosphere is welcoming, the equipment is well maintained, and the team makes it easy to stay consistent with my training.'],
              ['Amina Yusuf', 'I joined for fitness and found a real community. The classes are challenging, supportive, and something I look forward to every week.']
            ].map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-neutral-700 bg-[#171717]/90 p-6 shadow-lg">
                <div className="mb-4 flex gap-1 text-amber-500">{[0, 1, 2, 3, 4].map(item => <Star key={item} className="h-4 w-4 fill-amber-500" />)}</div>
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#6B7280]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>


      <Modal isOpen={!!previewImage} onClose={() => setPreviewImage(null)} title="GALLERY PREVIEW" maxWidth="lg">{previewImage&&<img src={previewImage} alt="SAREX Fitness Clinic gallery preview" className="max-h-[75vh] w-full rounded-xl object-contain"/>}</Modal>

      <section id="contact-section" className="bg-[#F7F7F5] py-24 text-[#111111] border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl lg:grid-cols-[.82fr_1.18fr]">
            <div className="p-8 sm:p-12 lg:p-14">
              <span className="text-xs font-black uppercase tracking-[.24em] text-[#EF1B23]">Contact us</span>
              <h2 className="mt-4 text-4xl font-black uppercase leading-tight sm:text-5xl">Visit SAREX Fitness Clinic</h2>
              <p className="mt-4 max-w-lg text-sm leading-6 text-[#6B7280]">Speak with our team about memberships, training plans, facility access, or your first visit.</p>
              <div className="mt-9 space-y-4">
                <a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer" className="flex items-start gap-4 rounded-xl border border-gray-200 p-4 transition hover:border-[#EF1B23] hover:bg-red-50/30"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#111111] text-white"><MapPin className="h-5 w-5"/></span><span><strong className="block text-sm">Gym location</strong><span className="mt-1 block text-xs leading-5 text-[#6B7280]">{settings.address}</span></span></a>
                <div className="flex items-start gap-3 rounded-xl border border-gray-200 p-4 hover:border-[#EF1B23]"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-[#EF1B23]"/><span><small className="block text-[10px] uppercase tracking-wider text-gray-500">Call us</small><span className="mt-1 flex flex-wrap gap-x-5 gap-y-1">{publicPhones.map(phone=><a key={phone} href={`tel:${phone.replace(/\D/g,'')}`} className="text-sm font-bold hover:text-[#EF1B23]">{phone}</a>)}</span></span></div>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-4 hover:border-[#EF1B23]"><Mail className="h-5 w-5 text-[#EF1B23]"/><span><small className="block text-[10px] uppercase tracking-wider text-gray-500">Email</small><strong className="text-sm">{settings.email}</strong></span></a>
              </div>
            </div>
            <div className="map-frame relative min-h-[430px] bg-[#171717] p-3 lg:min-h-full"><span className="map-location-pulse" aria-hidden="true"><MapPin className="h-5 w-5"/></span><iframe title="SAREX Fitness Clinic location" src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=18&ie=UTF8&iwloc=B&output=embed`} className="h-full min-h-[430px] w-full rounded-xl border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div>
          </div>
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:items-start">
              <div><span className="text-xs font-black uppercase tracking-[.24em] text-[#EF1B23]">Send a message</span><h3 className="mt-3 text-3xl font-black">How can we help?</h3><p className="mt-3 text-sm leading-6 text-gray-500">Ask about membership plans, training services, spa sessions, or visiting the clinic.</p></div>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();const subject=encodeURIComponent(`Website enquiry from ${contactForm.name}`);const body=encodeURIComponent(`Name: ${contactForm.name}\nEmail: ${contactForm.email}\nPhone: ${contactForm.phone}\n\n${contactForm.message}`);window.location.href=`mailto:${settings.email}?subject=${subject}&body=${body}`}}>
                <input required aria-label="Full name" placeholder="Full name" value={contactForm.name} onChange={e=>setContactForm({...contactForm,name:e.target.value})} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#EF1B23]"/>
                <input required type="email" aria-label="Email address" placeholder="Email address" value={contactForm.email} onChange={e=>setContactForm({...contactForm,email:e.target.value})} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#EF1B23]"/>
                <input required type="tel" aria-label="Phone number" placeholder="Phone number" value={contactForm.phone} onChange={e=>setContactForm({...contactForm,phone:e.target.value})} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#EF1B23] sm:col-span-2"/>
                <textarea required rows={5} aria-label="Message" placeholder="Tell us how we can help" value={contactForm.message} onChange={e=>setContactForm({...contactForm,message:e.target.value})} className="rounded-lg border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#EF1B23] sm:col-span-2"/>
                <button className="reference-button sm:col-span-2">Send message</button>
              </form>
            </div>
          </div>
        </div>
      </section>


      </div>
    </PublicLayout>
  );
};





