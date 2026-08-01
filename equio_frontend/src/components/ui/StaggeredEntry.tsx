import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/classNames';

interface StaggeredEntryProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}

export function StaggeredEntry({
  children,
  className,
  delay = 0,
  staggerDelay = 0.04
}: StaggeredEntryProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: delay,
        staggerChildren: staggerDelay
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.2, 0, 0, 1] as const
      }
    }
  };

  const animatedChildren = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    return (
      <motion.div variants={itemVariants}>
        {child}
      </motion.div>
    );
  });

  return (
    <motion.div
      className={cn("w-full", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {animatedChildren}
    </motion.div>
  );
}
