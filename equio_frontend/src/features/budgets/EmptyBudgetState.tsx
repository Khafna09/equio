import { Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useI18n } from '../../i18n/i18nContextValue';

interface EmptyBudgetStateProps {
  onOpenDrawer: (isGlobal: boolean) => void;
}

export function EmptyBudgetState({ onOpenDrawer }: EmptyBudgetStateProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
        className="relative w-32 h-32 mb-8"
      >
        <div className="absolute inset-0 bg-primary-100 dark:bg-primary-950/40 rounded-full blur-2xl opacity-60 animate-pulse" />
        <div className="relative w-full h-full bg-white dark:bg-neutral-800 rounded-3xl shadow-xl shadow-primary-500/10 border border-primary-100/50 dark:border-neutral-700 flex items-center justify-center rotate-3 hover:rotate-6 transition-transform">
          <Wallet className="w-16 h-16 text-primary-500 dark:text-primary-400" />
        </div>
      </motion.div>

      <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-3 text-center">{t('budgets.emptyTitle')}</h3>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm text-center">
        Toma el control de tus finanzas estableciendo un lmite de gastos.
      </p>

      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <button
          onClick={() => onOpenDrawer(true)}
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-primary-500 px-8 py-4 font-semibold text-white shadow-lg shadow-primary-500/30 transition-all hover:scale-105 hover:bg-primary-600 active:scale-95"
        >
          <span className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-13deg)_translateX(100%)]">
            <div className="relative h-full w-8 bg-white/20" />
          </span>
           {t('common.sparkles')} {t('budgets.setupMyBudget')}
        </button>
        
        <button 
          onClick={() => onOpenDrawer(false)}
          className="text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors underline-offset-4 hover:underline"
        >
          O aadir lmite solo para una categora
        </button>
      </div>
    </div>
  );
}
