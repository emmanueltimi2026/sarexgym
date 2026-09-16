export const benefits = [
  {
    title: 'Training that fits your goal',
    description: 'Build strength, improve fitness, lose weight, or return to movement with practical support at every stage.'
  },
  {
    title: 'Recovery under one roof',
    description: 'Balance hard work with body massage, full-body spa care, mobility, and restorative wellness services.'
  },
  {
    title: 'A smoother member experience',
    description: 'Choose a plan online, manage your membership, follow workout plans, and check in quickly at reception.'
  }
];

export const facilities = [
  {
    id: 'training-floor',
    category: 'Strength & conditioning',
    title: 'Open gym floor',
    image: '/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg',
    description: 'A practical training floor with free weights, resistance equipment, and space for strength, conditioning, and independent workouts.',
    features: ['Free weights and resistance training', 'Cardio and conditioning equipment', 'Floor support from the training team']
  },
  {
    id: 'group-fitness',
    category: 'Movement & cardio',
    title: 'Aerobics and guided sessions',
    image: '/assets/photos/photo-1518611012118-696072aa579a.jpg',
    description: 'Instructor-led sessions designed to improve stamina, coordination, mobility, and consistency in a motivating environment.',
    features: ['Aerobics classes', 'Core and abdominal sessions', 'Adaptable intensity levels']
  },
  {
    id: 'personal-training',
    category: 'Goal-based support',
    title: 'Personal training',
    image: '/assets/photos/photo-1574680096145-d05b474e2155.jpg',
    description: 'Focused coaching and progressive workout planning for members who want more structure, accountability, and measurable progress.',
    features: ['Personalized workout direction', 'Weight-loss and muscle-tone support', 'Progress-focused programming']
  },
  {
    id: 'spa-recovery',
    category: 'Wellness & recovery',
    title: 'Full-body spa',
    image: '/assets/photos/full-body-spa.jfif',
    description: 'A calming wellness experience that helps reduce tension, improve relaxation, and support recovery between training sessions.',
    features: ['Full-body spa care', 'Relaxation and recovery', 'Appointment-based service']
  },
  {
    id: 'massage',
    category: 'Therapeutic recovery',
    title: 'Body massage',
    image: '/assets/photos/massage.jfif',
    description: 'Professional massage sessions for muscular tension relief, circulation, relaxation, and post-training recovery.',
    features: ['Targeted tension relief', 'Post-workout recovery', 'Bookable sessions']
  },
  {
    id: 'maternal-wellness',
    category: 'Supported movement',
    title: 'Pregnancy and after-birth fitness',
    image: '/assets/photos/pregnancy.jpg',
    description: 'Carefully adapted prenatal and postnatal movement focused on mobility, confidence, strength, and a comfortable return to activity.',
    features: ['Prenatal movement support', 'Postnatal conditioning', 'Consultation-led sessions']
  }
];

export const galleryPhotos = [
  'photo-1517838277536-f5f99be501cd.jpg',
  'photo-1549060279-7e168fcee0c2.jpg',
  'photo-1574680096145-d05b474e2155.jpg',
  'photo-1581009146145-b5ef050c2e1e.jpg',
  'photo-1518611012118-696072aa579a.jpg',
  'photo-1534367507873-d2d7e24c797f.jpg',
  'photo-1492562080023-ab3db95bfbce.jpg',
  'photo-1500648767791-00dcc994a43e.jpg',
  'photo-1506794778202-cad84cf45f1d.jpg',
  'photo-1507003211169-0a1dd7228f2d.jpg',
  'photo-1519085360753-af0119f7cbe7.jpg',
  'images.jfif'
].map(file => `/assets/photos/${file}`);

export const testimonials = [
  ['Samuel Ojo', 'The coaches pay attention to technique and progress. Every session feels purposeful, and I have become much stronger and more confident.'],
  ['Bola Taju', 'The atmosphere is welcoming, the equipment is well maintained, and the team makes it easy to stay consistent with my training.'],
  ['Amina Yusuf', 'I joined for fitness and found a real community. The classes are challenging, supportive, and something I look forward to every week.'],
  ['Tunde Adebayo', 'The reception process is smooth, the gym feels organized, and the team always knows how to guide members properly.'],
  ['Grace Nwosu', 'SAREX helped me stay consistent with training and recovery. The spa and massage services make the whole routine feel complete.']
] as const;

export const openingHours = [
  ['Monday - Friday', '6:00 AM - 9:00 PM'],
  ['Saturday', '7:00 AM - 7:00 PM'],
  ['Sunday', '8:00 AM - 5:00 PM']
] as const;

