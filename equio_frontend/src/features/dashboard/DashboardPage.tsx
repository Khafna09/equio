import { useDashboard } from '../../hooks/useDashboard';
import { useMovements } from '../../hooks/useMovements';
import { useSavings } from '../../hooks/useSavings';
import { BalanceCard } from './BalanceCard';
import { DonutChart } from './DonutChart';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Wallet, TrendingDown, TrendingUp, PieChart, Plus, AlertCircle, ChevronDown, Target, Plane, Home, Car, Landmark, Sparkles, GraduationCap, HeartPulse, Smartphone, Gift, BriefcaseBusiness, Gamepad2, Dumbbell, Baby, ShieldCheck, Shirt, Utensils, Music, Camera, BookOpen, Wrench } from 'lucide-react';
import { NewMovementModal } from '../movements/NewMovementModal';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../components/ui/hover-card';
import { ShinyButton } from '../../components/ui/shiny-button';
import { parseISO, isValid, format } from 'date-fns';
import { SplitText } from '../../components/reactbits/split-text';
import { useAuth } from '../../contexts/authContextValue';
import { cn } from '../../utils/classNames';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useCurrency } from '../../hooks/useCurrency';
import { useI18n } from '../../i18n/i18nContextValue';
import type { MovementResponse } from '../../types/movement.types';


function formatMovementSubtitle(mov: MovementResponse) {
  const note = mov.description?.trim() ?? '';
  const hasNote = note.length > 0;

  let timeStr = '';
  const dateStr = mov.date || mov.createdAt;
  if (dateStr) {
    try {
      const d = parseISO(dateStr);
      if (isValid(d)) {
        timeStr = format(d, 'HH:mm');
      }
    } catch {
      timeStr = '';
    }
    if (!timeStr && typeof dateStr === 'string') {
      const match = dateStr.match(/T(\d{2}:\d{2})/);
      if (match) timeStr = match[1];
    }
  }

  if (!hasNote) {
    return {
      hasNote: false,
      text: timeStr,
      fullText: ''
    };
  }

  const words = note.split(/\s+/);
  const truncatedNote = words.length > 6 ?words.slice(0, 6).join(' ') + '...' : note;
  const prefix = timeStr ?`${timeStr} | ` : '';

  return {
    hasNote: true,
    text: `${prefix}${truncatedNote}`,
    fullText: `${note}`
  };
}

const getGoalStyle = (name: string, index: number) => {
  const lower = name.toLowerCase();
  const matches = (terms: string[]) => terms.some((term) => lower.includes(term));

  if (matches(['viaje', 'trip', 'vuelo', 'vacaciones', 'japon', 'japn', 'europa', 'playa', 'hotel'])) {
    return { icon: <Plane className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-50', text: 'text-blue-600', bar: 'bg-blue-500' };
  }
  if (matches(['casa', 'house', 'departamento', 'hogar', 'depa', 'renta', 'alquiler', 'mudanza'])) {
    return { icon: <Home className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50', text: 'text-purple-600', bar: 'bg-purple-500' };
  }
  if (matches(['auto', 'car', 'coche', 'vehiculo', 'vehculo', 'tesla', 'moto', 'bicicleta'])) {
    return { icon: <Car className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500' };
  }
  if (matches(['estudio', 'universidad', 'curso', 'master', 'maestria', 'maestra', 'libro', 'educacion', 'educacin'])) {
    return { icon: <GraduationCap className="w-5 h-5 text-sky-600" />, bg: 'bg-sky-50', text: 'text-sky-600', bar: 'bg-sky-500' };
  }
  if (matches(['salud', 'doctor', 'medico', 'mdico', 'clinica', 'clnica', 'terapia', 'seguro'])) {
    return { icon: <HeartPulse className="w-5 h-5 text-red-600" />, bg: 'bg-red-50', text: 'text-red-600', bar: 'bg-red-500' };
  }
  if (matches(['telefono', 'telfono', 'iphone', 'celular', 'laptop', 'pc', 'computadora', 'tecnologia', 'tecnologa'])) {
    return { icon: <Smartphone className="w-5 h-5 text-cyan-600" />, bg: 'bg-cyan-50', text: 'text-cyan-600', bar: 'bg-cyan-500' };
  }
  if (matches(['regalo', 'cumple', 'boda', 'navidad', 'aniversario'])) {
    return { icon: <Gift className="w-5 h-5 text-pink-600" />, bg: 'bg-pink-50', text: 'text-pink-600', bar: 'bg-pink-500' };
  }
  if (matches(['negocio', 'empresa', 'trabajo', 'emprendimiento', 'oficina'])) {
    return { icon: <BriefcaseBusiness className="w-5 h-5 text-slate-600" />, bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-500' };
  }
  if (matches(['juego', 'gaming', 'consola', 'playstation', 'xbox', 'nintendo'])) {
    return { icon: <Gamepad2 className="w-5 h-5 text-violet-600" />, bg: 'bg-violet-50', text: 'text-violet-600', bar: 'bg-violet-500' };
  }
  if (matches(['gym', 'gimnasio', 'fitness', 'deporte', 'running', 'entrenamiento'])) {
    return { icon: <Dumbbell className="w-5 h-5 text-lime-700" />, bg: 'bg-lime-50', text: 'text-lime-700', bar: 'bg-lime-500' };
  }
  if (matches(['bebe', 'beb', 'hijo', 'familia', 'nio', 'nino'])) {
    return { icon: <Baby className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50', text: 'text-orange-600', bar: 'bg-orange-500' };
  }
  if (matches(['emergencia', 'fondo', 'reserva', 'seguridad'])) {
    return { icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' };
  }
  if (matches(['ropa', 'zapatos', 'outfit', 'moda'])) {
    return { icon: <Shirt className="w-5 h-5 text-fuchsia-600" />, bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', bar: 'bg-fuchsia-500' };
  }
  if (matches(['comida', 'restaurante', 'cena', 'cocina'])) {
    return { icon: <Utensils className="w-5 h-5 text-yellow-700" />, bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
  }
  if (matches(['musica', 'msica', 'concierto', 'festival'])) {
    return { icon: <Music className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500' };
  }
  if (matches(['camara', 'cmara', 'foto', 'fotografia', 'fotografa'])) {
    return { icon: <Camera className="w-5 h-5 text-neutral-700" />, bg: 'bg-neutral-100', text: 'text-neutral-700', bar: 'bg-neutral-500' };
  }
  if (matches(['leer', 'lectura', 'biblioteca'])) {
    return { icon: <BookOpen className="w-5 h-5 text-teal-600" />, bg: 'bg-teal-50', text: 'text-teal-600', bar: 'bg-teal-500' };
  }
  if (matches(['reparacion', 'reparacin', 'herramienta', 'renovacion', 'renovacin'])) {
    return { icon: <Wrench className="w-5 h-5 text-stone-600" />, bg: 'bg-stone-100', text: 'text-stone-600', bar: 'bg-stone-500' };
  }

  const PALETTES = [
    { icon: <Target className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50', text: 'text-emerald-600', bar: 'bg-emerald-500' },
    { icon: <Landmark className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500' },
    { icon: <Sparkles className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500' },
  ];
  return PALETTES[index % PALETTES.length];
};

import { useSharedElementModal } from '../../hooks/useSharedElementModal';

export function DashboardPage() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { t } = useI18n();
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const { triggerRect, captureTrigger } = useSharedElementModal();
  const [isSavingsExpanded, setIsSavingsExpanded] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const { data: summary, isLoading: isLoadingSummary, error: dashboardError, refetch } = useDashboard();
  const { movements, isLoading: isLoadingMovements } = useMovements();
  const { savings, isLoading: isLoadingSavings } = useSavings();

  const arrowRef = useRef<HTMLDivElement>(null);
  const savingsContainerRef = useRef<HTMLDivElement>(null);

  const userName = user?.firstName || (user?.email ?user.email.split('@')[0] : t('common.user'));

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 25 || document.documentElement.scrollTop > 25) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (containerRef.current) {
      const mainCards = containerRef.current.querySelectorAll('.dashboard-card');
      gsap.fromTo(
        mainCards,
        { y: 30, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.05, ease: 'back.out(1.2)' }
      );
    }

    if (arrowRef.current) {
      gsap.to(arrowRef.current, {
        rotate: isSavingsExpanded ?180 : 0,
        duration: 0.45,
        ease: 'power3.out',
      });
    }

    if (savingsContainerRef.current && isSavingsExpanded) {
      gsap.fromTo(
        savingsContainerRef.current,
        { opacity: 0, y: -12, scaleY: 0.95, transformOrigin: 'top center' },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.55, ease: 'power3.out', clearProps: 'transform' }
      );
      const cards = savingsContainerRef.current.querySelectorAll('.saving-card-item');
      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 20, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.45, stagger: 0.08, ease: 'back.out(1.2)' }
        );
      }
    }
  }, [isSavingsExpanded, savings.length]);

  const recentMovements = useMemo(() => {
    return [...movements]
      .sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime();
        const dateB = new Date(b.date || b.createdAt).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return b.id - a.id;
      })
      .slice(0, 5);
  }, [movements]);

  return (
    <div ref={containerRef} className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
          <SplitText text={t('dashboard.greeting', { name: userName })} delay={0.03} />
        </h1>
        <ShinyButton
          onClick={(e: React.MouseEvent) => {
            captureTrigger(e);
            setIsNewMovementOpen(true);
          }}
          className="bg-primary-600 text-white hover:bg-primary-700"
        >
          <span className="font-semibold flex items-center gap-2 px-2 text-white capitalize text-sm">
            <Plus className="w-4 h-4" /> {t('dashboard.newMovement')}
          </span>
        </ShinyButton>
      </div>

      {dashboardError && (
        <div className="flex items-center gap-3 p-3.5 bg-tertiary-50 border border-tertiary-200 rounded-2xl text-tertiary-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{dashboardError}</span>
          <button onClick={() => refetch()} className="ml-auto text-sm font-semibold underline">
            {t('common.retry')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {isLoadingSummary ?(
          <>
            <div className="h-32 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            <div className="h-32 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
            <div className="h-32 rounded-3xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </>
        ) : (
          <>
            <BalanceCard
              title={t('dashboard.totalBalance')}
              amount={summary?.balance ?? 0}
              type="balance"
              globalBudgetAmount={summary?.globalBudgetAmount}
              savingsDeduction={summary?.savingsDeduction}
            />
            <BalanceCard title={t('dashboard.monthIncome')} amount={summary?.totalIncome ?? 0} type="income" />
            <BalanceCard title={t('dashboard.monthExpenses')} amount={summary?.totalExpense ?? 0} type="expense" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-5">
        <Card className="dashboard-card lg:col-span-1 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-neutral-900 dark:text-white text-base md:text-lg">{t('dashboard.expensesByCategory')}</h3>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-full">
              {t('dashboard.currentMonth')}
            </span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {isLoadingSummary ?(
              <div className="w-44 h-44 rounded-full bg-neutral-100 dark:bg-neutral-800 animate-pulse mx-auto" />
            ) : !summary?.topCategories || summary.topCategories.length === 0 ?(
              <div className="text-center p-6 bg-neutral-50 dark:bg-neutral-900/60 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-700/60 my-auto">
                <div className="w-14 h-14 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3 text-neutral-400 dark:text-neutral-500 dark:text-neutral-400">
                  <PieChart className="w-7 h-7" />
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs md:text-sm">
                  {t('dashboard.expensesEmpty')}
                </p>
              </div>
            ) : (
              <DonutChart data={summary.topCategories} />
            )}
          </div>
        </Card>

        <Card className="dashboard-card lg:col-span-2 p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-neutral-900 dark:text-white text-base md:text-lg">{t('dashboard.latestMovements')}</h3>
            <Link to="/history">
              <Button variant="ghost" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 text-xs md:text-sm">
                {t('dashboard.viewAll')}
              </Button>
            </Link>
          </div>
          {isLoadingMovements ?(
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : recentMovements && recentMovements.length > 0 ?(
            <div className="space-y-1.5">
              {recentMovements.map((mov) => {
                const subInfo = formatMovementSubtitle(mov);

                const cardContent = (
                  <div
                    className="flex items-center justify-between p-2.5 rounded-2xl border-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: `${mov.categoryColor || '#10B981'}20` }}
                      >
                        {mov.categoryIcon ?(
                          <span>{mov.categoryIcon}</span>
                        ) : mov.type === 'INCOME' ?(
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-danger-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">
                          {mov.categoryName}
                        </p>
                        {subInfo.text && (
                          <p className="text-xs truncate text-neutral-500 dark:text-neutral-400">
                            {subInfo.text}
                          </p>
                        )}
                      </div>
                    </div>
                    <div
                      className={`font-bold text-sm flex-shrink-0 whitespace-nowrap ml-4 ${mov.type === 'INCOME' ?'text-emerald-600 dark:text-emerald-400' : 'text-danger-600 dark:text-rose-400'}`}
                    >
                      {mov.type === 'INCOME' ?'+' : '-'}
                      {formatCurrency(mov.amount)}
                    </div>
                  </div>
                );

                if (!subInfo.hasNote) {
                  return <div key={mov.id}>{cardContent}</div>;
                }

                return (
                  <HoverCard key={mov.id}>
                    <HoverCardTrigger className="block w-full">
                      {cardContent}
                    </HoverCardTrigger>
                    <HoverCardContent side="top" className="w-64 border-none shadow-xl dark:bg-neutral-800 dark:text-white">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{mov.categoryName}</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{subInfo.fullText}</p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900/60 rounded-3xl border-2 border-dashed border-neutral-200 dark:border-neutral-700/60">
              <Wallet className="w-10 h-10 text-neutral-300 dark:text-neutral-600 mb-3" />
              <h4 className="text-neutral-900 dark:text-white font-semibold text-sm mb-1">{t('dashboard.noMovements')}</h4>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs text-center max-w-sm">
                {t('dashboard.noMovementsHint')}
              </p>
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <div
          onClick={() => setIsSavingsExpanded(!isSavingsExpanded)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-neutral-900 dark:text-white text-base md:text-lg">{t('dashboard.savingsGoals')}</h3>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-3 py-1 rounded-full">
              {savings.length} {savings.length === 1 ?t('dashboard.activeGoal') : t('dashboard.activeGoals')}
            </span>
          </div>

          <div
            ref={arrowRef}
            className="p-2 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>

        {isSavingsExpanded && (
          <div ref={savingsContainerRef} className="pt-8 border-t border-neutral-100 dark:border-neutral-700 mt-4 origin-top">
            {isLoadingSavings ?(
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : savings.length === 0 ?(
              <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-900 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-700">
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">{t('dashboard.noSavingsGoals')}</p>
                <Link to="/savings">
                  <Button variant="outline" className="text-xs">
                    + {t('dashboard.createFirstGoal')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savings.map((goal, idx) => {
                  const style = getGoalStyle(goal.name, idx);
                  const formatShortCurrency = (val: number) => formatCurrency(val, { maximumFractionDigits: 0 });

                  return (
                    <div
                      key={goal.id}
                      className="saving-card-item bg-neutral-50/80 dark:bg-neutral-800/80 border border-neutral-200/70 dark:border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between hover:bg-white dark:bg-neutral-800 dark:hover:bg-neutral-800 hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className={`w-10 h-10 rounded-2xl ${style.bg} flex items-center justify-center`}>
                            {style.icon}
                          </div>
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${style.bg} ${style.text}`}>
                            {goal.progressPercentage}%
                          </span>
                        </div>

                        <h4 className="font-bold text-neutral-900 dark:text-white text-base mt-3 truncate">{goal.name}</h4>
                        <p className="text-xs font-semibold text-neutral-400 mt-0.5">
                          {formatShortCurrency(goal.currentAmount)} {t('categories.of')} {formatShortCurrency(goal.targetAmount)}
                        </p>
                      </div>

                      <div className="w-full bg-neutral-200/60 h-1.5 rounded-full overflow-hidden mt-4">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${style.bar}`}
                          style={{ width: `${Math.min(100, goal.progressPercentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      <div
        className={cn(
          "fixed bottom-2 left-1/2 -translate-x-1/2 z-30 transition-all duration-300 pointer-events-none flex items-center justify-center",
          hasScrolled ?"opacity-0 translate-y-2" : "opacity-100 translate-y-0"
        )}
      >
        <div className="w-7 h-7 bg-white dark:bg-neutral-800/95 backdrop-blur-md border border-neutral-200 dark:border-neutral-700/90 shadow-sm rounded-full flex items-center justify-center text-neutral-400 animate-bounce">
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>

      <NewMovementModal
        isOpen={isNewMovementOpen}
        onClose={() => setIsNewMovementOpen(false)}
        triggerRect={triggerRect}
      />
    </div>
  );
}
