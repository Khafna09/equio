import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/classNames';
import type { TriggerRect } from '../../hooks/useSharedElementModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  triggerRect?: TriggerRect | null;
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className, 
  containerClassName,
  triggerRect 
}: ModalProps) {

  // Calculate shared element transform offset relative to screen center
  const getSharedTransform = () => {
    if (!triggerRect || typeof window === 'undefined') return null;
    const windowWidth = window.innerWidth || 1200;
    const windowHeight = window.innerHeight || 800;

    const modalCenterX = windowWidth / 2;
    const modalCenterY = windowHeight / 2;

    const triggerCenterX = triggerRect.left + triggerRect.width / 2;
    const triggerCenterY = triggerRect.top + triggerRect.height / 2;

    const translateX = triggerCenterX - modalCenterX;
    const translateY = triggerCenterY - modalCenterY;

    const scale = Math.min(1, Math.max(0.4, (triggerRect.width + triggerRect.height) / 900));

    return { translateX, translateY, scale };
  };

  const sharedTransform = getSharedTransform();

  const initialVariant = sharedTransform ? {
    x: sharedTransform.translateX,
    y: sharedTransform.translateY,
    scale: sharedTransform.scale,
    opacity: 0,
    borderRadius: '32px'
  } : {
    scale: 0.95,
    y: 16,
    opacity: 0,
    borderRadius: '24px'
  };

  const animateVariant = {
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    borderRadius: '24px'
  };

  const exitVariant = sharedTransform ? {
    x: sharedTransform.translateX,
    y: sharedTransform.translateY,
    scale: sharedTransform.scale,
    opacity: 0,
    borderRadius: '32px'
  } : {
    scale: 0.95,
    y: 12,
    opacity: 0
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center p-4", containerClassName)}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
          />
          
          <motion.div
            initial={initialVariant}
            animate={animateVariant}
            exit={exitVariant}
            transition={{
              duration: 0.22,
              ease: [0.16, 1, 0.3, 1]
            }}
            className={cn(
              "relative z-10 w-full max-w-md bg-white dark:bg-neutral-800 border border-transparent dark:border-neutral-700/80 shadow-2xl origin-center overflow-hidden flex flex-col max-h-[90vh] transform-gpu will-change-transform text-neutral-900 dark:text-white",
              className
            )}
          >
            {title && (
              <div className="flex items-center justify-between p-6 pb-2 shrink-0">
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h3>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white bg-neutral-50 dark:bg-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            {!title && (
              <button 
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white bg-neutral-50 dark:bg-neutral-700/60 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            <div className="p-6 pt-4 overflow-y-auto overflow-x-hidden relative flex-1">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
