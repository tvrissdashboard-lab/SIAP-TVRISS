import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ShieldCheck, Sparkles, X, CheckCircle2 } from 'lucide-react';

export interface SuccessModalState {
  isOpen: boolean;
  title: string;
  message?: string;
  badge?: string;
  type?: 'success' | 'approval' | 'info';
  autoCloseMs?: number;
}

interface SuccessModalProps {
  data?: SuccessModalState;
  state?: SuccessModalState;
  onClose: () => void;
}

// Generate random particle properties for confetti explosion
const CONFETTI_PARTICLES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * 360;
  const radius = 60 + Math.random() * 70;
  const rad = (angle * Math.PI) / 180;
  return {
    id: i,
    x: Math.cos(rad) * radius,
    y: Math.sin(rad) * radius,
    scale: 0.5 + Math.random() * 0.8,
    rotation: Math.random() * 360,
    color: [
      'bg-amber-400', 
      'bg-emerald-400', 
      'bg-blue-500', 
      'bg-indigo-400', 
      'bg-yellow-300', 
      'bg-teal-400'
    ][i % 6]
  };
});

export const SuccessModal: React.FC<SuccessModalProps> = ({ data, state, onClose }) => {
  const modalData = data || state || { isOpen: false, title: '' };
  const { isOpen, title, message, badge = 'SIAP SUMSEL', type = 'success', autoCloseMs = 1800 } = modalData;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0, y: 20 }}
            animate={{ 
              scale: 1, 
              opacity: 1, 
              y: 0,
              transition: { type: 'spring', damping: 22, stiffness: 300 }
            }}
            exit={{ scale: 0.85, opacity: 0, y: -10, transition: { duration: 0.15 } }}
            className="relative bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl text-center space-y-5 overflow-hidden text-slate-900 z-10"
          >
            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full transition hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Background Glow Ring */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Icon & Particles Burst */}
            <div className="relative flex items-center justify-center pt-2">
              {/* Confetti Particles */}
              {CONFETTI_PARTICLES.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0, rotate: 0 }}
                  animate={{ 
                    x: p.x, 
                    y: p.y, 
                    opacity: 0, 
                    scale: p.scale, 
                    rotate: p.rotation + 180 
                  }}
                  transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute w-2.5 h-2.5 rounded-sm ${p.color} shadow-sm`}
                />
              ))}

              {/* Outer Pulsing Ring */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [0.8, 1.25, 1.1], opacity: [0, 0.6, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                className={`absolute w-24 h-24 rounded-full border-2 ${
                  type === 'approval' ? 'border-amber-400' : 'border-emerald-400'
                }`}
              />

              {/* Main Animated Circle Checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  type: 'spring', 
                  stiffness: 350, 
                  damping: 18, 
                  delay: 0.05 
                }}
                className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl relative z-10 ${
                  type === 'approval'
                    ? 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-amber-500/30'
                    : 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-emerald-500/30'
                }`}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.2, duration: 0.35 }}
                >
                  <Check className="w-10 h-10 stroke-[3.5]" />
                </motion.div>
              </motion.div>
            </div>

            {/* Badge & Title */}
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-300/80 px-3 py-1 rounded-full text-[10px] font-black uppercase text-amber-900 tracking-wider shadow-sm">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>{badge}</span>
              </div>

              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug"
              >
                {title}
              </motion.h3>

              {message && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-xs text-slate-600 font-medium max-w-xs mx-auto leading-relaxed"
                >
                  {message}
                </motion.p>
              )}
            </div>

            {/* Auto-Dismiss Progress Bar */}
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                className={`h-full ${
                  type === 'approval' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
