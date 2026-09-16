import React, { useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

const premiumEase = [0.22, 1, 0.36, 1] as const;

type MotionTag = 'div' | 'section' | 'article' | 'a' | 'ol' | 'ul' | 'li' | 'figure' | 'img' | 'form' | 'p' | 'h1';

const motionElements: Record<MotionTag, React.ElementType> = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  a: motion.a,
  ol: motion.ol,
  ul: motion.ul,
  li: motion.li,
  figure: motion.figure,
  img: motion.img,
  form: motion.form,
  p: motion.p,
  h1: motion.h1,
};

interface MotionPrimitiveProps extends Record<string, unknown> {
  as?: MotionTag;
  children?: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  immediate?: boolean;
  viewportAmount?: number;
  viewportMargin?: string;
}

const activationProps = (immediate: boolean, amount = 0.16, margin = '0px 0px -56px') => immediate
  ? { animate: 'visible' }
  : { whileInView: 'visible', viewport: { once: true, amount, margin } };

export const FadeIn: React.FC<MotionPrimitiveProps> = ({
  as = 'div', children, className, delay = 0, duration = 0.42, immediate = false, ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const Component = motionElements[as];
  return (
    <Component
      className={className}
      initial="hidden"
      variants={{
        hidden: { opacity: reduceMotion ? 1 : 0 },
        visible: { opacity: 1, transition: { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: premiumEase } },
      }}
      {...activationProps(immediate)}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const SlideUp: React.FC<MotionPrimitiveProps & { distance?: number }> = ({
  as = 'div', children, className, delay = 0, duration = 0.48, distance = 22, immediate = false,
  viewportAmount = 0.16, viewportMargin = '0px 0px -56px', ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const Component = motionElements[as];
  return (
    <Component
      className={className}
      initial="hidden"
      variants={{
        hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : distance },
        visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: premiumEase } },
      }}
      {...activationProps(immediate, viewportAmount, viewportMargin)}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const ScaleReveal: React.FC<MotionPrimitiveProps & { scale?: number; distance?: number }> = ({
  as = 'div', children, className, delay = 0, duration = 0.52, scale = 0.975, distance = 0, immediate = false,
  viewportAmount = 0.16, viewportMargin = '0px 0px -56px', ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const Component = motionElements[as];
  return (
    <Component
      className={className}
      initial="hidden"
      variants={{
        hidden: { opacity: reduceMotion ? 1 : 0, scale: reduceMotion ? 1 : scale, y: reduceMotion ? 0 : distance },
        visible: { opacity: 1, scale: 1, y: 0, transition: { duration: reduceMotion ? 0 : duration, delay: reduceMotion ? 0 : delay, ease: premiumEase } },
      }}
      {...activationProps(immediate, viewportAmount, viewportMargin)}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const StaggerContainer: React.FC<MotionPrimitiveProps & { stagger?: number }> = ({
  as = 'div', children, className, delay = 0.04, stagger = 0.07, immediate = false, ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const Component = motionElements[as];
  return (
    <Component
      className={className}
      initial="hidden"
      {...activationProps(immediate, 0.12, '0px 0px -48px')}
      variants={{
        hidden: {},
        visible: { transition: { delayChildren: reduceMotion ? 0 : delay, staggerChildren: reduceMotion ? 0 : stagger } },
      }}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const StaggerItem: React.FC<MotionPrimitiveProps & { interactive?: boolean; distance?: number; hoverDistance?: number; hoverScale?: number }> = ({
  as = 'div', children, className, duration = 0.44, interactive = false, distance = 20,
  hoverDistance = 4, hoverScale = 1.006, ...rest
}) => {
  const reduceMotion = useReducedMotion();
  const Component = motionElements[as];
  return (
    <Component
      className={className}
      variants={{
        hidden: { opacity: reduceMotion ? 1 : 0, y: reduceMotion ? 0 : distance },
        visible: { opacity: 1, y: 0, transition: { duration: reduceMotion ? 0 : duration, ease: premiumEase } },
      }}
      whileHover={interactive && !reduceMotion ? { y: -hoverDistance, scale: hoverScale } : undefined}
      whileTap={interactive && !reduceMotion ? { scale: 0.996 } : undefined}
      transition={{ duration: 0.22, ease: premiumEase }}
      {...rest}
    >
      {children}
    </Component>
  );
};

export const PageTransition: React.FC<React.PropsWithChildren<{ direction?: -1 | 1 }>> = ({ children, direction = 1 }) => {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      custom={direction}
      variants={{
        enter: (travel: -1 | 1) => ({ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : travel * 16 }),
        center: { opacity: 1, x: 0 },
        exit: (travel: -1 | 1) => ({ opacity: reduceMotion ? 1 : 0, x: reduceMotion ? 0 : travel * -10 }),
      }}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: premiumEase }}
    >
      {children}
    </motion.div>
  );
};

export const PublicScrollProgress: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 150,
    damping: 28,
    mass: 0.3,
  });

  return (
    <motion.div
      className="public-scroll-progress"
      style={{ scaleX: reduceMotion ? scrollYProgress : smoothProgress }}
      aria-hidden="true"
    />
  );
};

interface PremiumImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  revealScale?: number;
}

export const PremiumImage: React.FC<PremiumImageProps> = ({
  className = '',
  onLoad,
  revealScale = 1.015,
  style,
  ...props
}) => {
  const reduceMotion = useReducedMotion();
  const [loaded, setLoaded] = useState(false);

  return (
    <motion.img
      {...props}
      className={`public-premium-image ${loaded ? 'is-loaded' : ''} ${className}`.trim()}
      initial={false}
      animate={{
        opacity: loaded || reduceMotion ? 1 : 0.45,
        scale: loaded || reduceMotion ? 1 : revealScale,
        filter: loaded || reduceMotion ? 'blur(0px)' : 'blur(6px)',
      }}
      transition={{ duration: reduceMotion ? 0 : 0.42, ease: premiumEase }}
      style={style}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
};
