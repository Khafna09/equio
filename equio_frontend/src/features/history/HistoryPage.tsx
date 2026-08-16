import { useState, useMemo, useRef, useEffect } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useMovements } from '../../hooks/useMovements';
import { useCategories } from '../../hooks/useCategories';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { TrendingDown, TrendingUp, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, GripVertical, RotateCcw } from 'lucide-react';
import { EditMovementModal } from '../movements/EditMovementModal';
import { format, isToday, isYesterday, parseISO, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { DndContext, useDraggable, useDroppable, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, pointerWithin } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { ProgressiveBlur } from '../../components/magicui/progressive-blur';
import { StaggeredEntry } from '../../components/ui/StaggeredEntry';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../../components/ui/hover-card';
import { useSharedElementModal } from '../../hooks/useSharedElementModal';
import { useCurrency } from '../../hooks/useCurrency';
import { useTimeFormat } from '../../hooks/useTimeFormat';
import { useI18n } from '../../i18n/i18nContextValue';
import type { MovementResponse } from '../../types/movement.types';

type MainMovementFilter = 'ALL' | 'INCOME' | 'EXPENSE';
type HistoryFilterType = MainMovementFilter | 'CATEGORY';

interface HistoryColumn {
  id: string;
  type: HistoryFilterType;
  label: string;
  categoryId?: number;
}

interface DragFilterData {
  label: string;
  type: HistoryFilterType;
}

function isHistoryFilterType(value: unknown): value is HistoryFilterType {
  return value === 'ALL' || value === 'INCOME' || value === 'EXPENSE' || value === 'CATEGORY';
}

function CalendarWidget({
  movements,
  selectedDate,
  onSelectDate,
  language
}: {
  movements: MovementResponse[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string | null) => void;
  language: 'es' | 'en';
}) {
  const { t } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const movementDates = useMemo(() => {
    const set = new Set<string>();
    movements.forEach(m => {
      const d = m.date ? m.date.substring(0, 10) : m.createdAt?.substring(0, 10);
      if (d) set.add(d);
    });
    return set;
  }, [movements]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-neutral-900 dark:text-white text-sm capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: language === 'en' ? enUS : es })}
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
            className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map(d => (
          <span key={d} className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateStr;
          const inMonth = isSameMonth(day, monthStart);
          const hasMovs = movementDates.has(dateStr);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(isSelected ? null : dateStr)}
              className={`
                relative h-8 rounded-xl flex items-center justify-center font-medium transition-all
                ${!inMonth
                  ? 'text-neutral-300 dark:text-neutral-600'
                  : isSelected
                    ? 'bg-primary-600 text-white font-bold shadow-md shadow-primary-500/30'
                    : isCurrentDay
                      ? 'bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-bold border border-primary-200 dark:border-primary-800'
                      : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/60'
                }
              `}
            >
              {format(day, 'd')}
              {hasMovs && !isSelected && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-secondary-500" />
              )}
              {hasMovs && isSelected && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="w-full text-xs text-primary-600 dark:text-primary-400 font-medium hover:underline flex items-center justify-center gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-700"
        >
          <RotateCcw className="w-3 h-3" /> {t('history.viewAllDays')}
        </button>
      )}
    </Card>
  );
}

function DraggableFilter({
  id,
  label,
  color,
  type,
  className,
  onAdd
}: {
  id: string;
  label: string;
  color?: string;
  type: string;
  className?: string;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { label, type }
  });

  const style = {
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      className={`cursor-grab active:cursor-grabbing group inline-flex items-center transition-transform hover:scale-105 ${className || ''}`}
    >
      <Badge
        variant="outline"
        className="w-auto hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-primary-100/80 dark:border-neutral-700 shadow-sm transition-all py-1 px-2.5 rounded-xl cursor-grab bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
        style={color ? { borderLeftColor: color, borderLeftWidth: '4px' } : undefined}
      >
        <span className="flex items-center gap-1.5 justify-between pointer-events-none">
          <span className="flex items-center gap-1 font-semibold text-[11px] whitespace-nowrap">
            <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
            {label}
          </span>
        </span>
      </Badge>
    </div>
  );
}

function formatMovementSubtitle(mov: MovementResponse, formatTime: (date: Date) => string) {
  const note = mov.description?.trim() ?? '';
  const hasNote = note.length > 0;

  let timeStr = '';
  const dateStr = mov.date || mov.createdAt;
  if (dateStr) {
    try {
      const d = parseISO(dateStr);
      if (isValid(d)) {
        timeStr = formatTime(d);
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

  const prefix = timeStr ? `${timeStr} | ` : '';

  return {
    hasNote: true,
    text: `${prefix}${note}`,
    fullText: `${prefix}${note}`
  };
}


function MovementList({
  movements,
  title,
  headerContent,
  onClose,
  isRemovable,
  onMovementClick
}: {
  movements: MovementResponse[];
  title?: string;
  headerContent?: React.ReactNode;
  onClose?: () => void;
  isRemovable?: boolean;
  onMovementClick: (movement: MovementResponse, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const { formatCurrency } = useCurrency();
  const { formatTime } = useTimeFormat();
  const { t, language } = useI18n();

  const groupedMovements = useMemo(() => {
    return movements.reduce<Record<string, MovementResponse[]>>((groups, mov) => {
      const date = mov.date ? mov.date.substring(0, 10) : (mov.createdAt ? mov.createdAt.substring(0, 10) : '');
      if (!groups[date]) groups[date] = [];
      groups[date].push(mov);
      return groups;
    }, {});
  }, [movements]);

  const sortedDateGroups = useMemo(() => {
    return Object.entries(groupedMovements)
      .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
      .map(([date, movs]) => [
        date,
        [...movs].sort((a, b) => b.id - a.id)
      ] as [string, MovementResponse[]]);
  }, [groupedMovements]);

  const getDateLabel = (dateStr: string) => {
    try {
      const date = parseISO(dateStr.substring(0, 10));
      if (isToday(date)) return t('history.today');
      if (isYesterday(date)) return t('history.yesterday');
      return format(date, language === 'en' ? 'MMMM d, yyyy' : "d 'de' MMMM, yyyy", { locale: language === 'en' ? enUS : es });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 min-w-[300px] max-w-[400px] h-[calc(100vh-190px)] flex flex-col relative overflow-hidden rounded-3xl">
      <div className="flex justify-between items-center mb-3 min-h-[32px] shrink-0">
        {headerContent ? (
          headerContent
        ) : (
          <h3 className="font-bold text-neutral-900 dark:text-white border-b-2 border-primary-500 pb-1 inline-block">{title}</h3>
        )}
        {isRemovable && onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {movements.length === 0 ? (
        <div className="text-center py-8 text-neutral-500 dark:text-neutral-400 bg-neutral-100/50 dark:bg-neutral-900/50 rounded-3xl border border-dashed border-primary-200/50 dark:border-neutral-700/50">
          {t('history.noMovements')}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1.5 space-y-5 pb-4 relative">
          {sortedDateGroups.map(([date, movs]) => (
            <div key={date}>
              <h4 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-2.5 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> {getDateLabel(date)}
              </h4>
              <StaggeredEntry className="space-y-2">
                {movs.map((mov) => {
                  const subInfo = formatMovementSubtitle(mov, formatTime);

                  const cardContent = (
                    <button
                      type="button"
                      className="w-full text-left focus:outline-none"
                      onClick={(e) => onMovementClick(mov, e)}
                    >
                      <div className="p-2.5 px-3.5 rounded-2xl flex flex-row items-center justify-between bg-white dark:bg-neutral-800 shadow-sm shadow-primary-500/5 hover:bg-primary-50 dark:hover:bg-neutral-700/60 hover:shadow-primary-500/10 transition-colors cursor-pointer border border-transparent dark:border-neutral-700/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 shadow-xs"
                            style={{ backgroundColor: `${mov.categoryColor || '#10B981'}20` }}
                          >
                            {mov.categoryIcon || (mov.type === 'INCOME' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-rose-500" />)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-neutral-900 dark:text-white text-sm leading-tight">{mov.categoryName ?? t('common.uncategorized')}</p>
                            {subInfo.text && (
                              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5 break-words">
                                {subInfo.text}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className={`font-bold text-sm flex-shrink-0 whitespace-nowrap ml-2 ${mov.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-danger-600 dark:text-rose-400'}`}>
                          {mov.type === 'INCOME' ? '+' : '-'}{formatCurrency(mov.amount)}
                        </div>
                      </div>
                    </button>
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
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">{mov.categoryName ?? t('common.uncategorized')}</h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">{subInfo.fullText}</p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </StaggeredEntry>
            </div>
          ))}
        </div>
      )}

      <ProgressiveBlur direction="bottom" className="bottom-0 h-4 pointer-events-none" />
    </div>
  );
}

export function HistoryPage() {
  const { movements, isLoading } = useMovements();
  const { categories } = useCategories();
  const { triggerRect, captureTrigger } = useSharedElementModal();
  const { t, language } = useI18n();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [columns, setColumns] = useState<HistoryColumn[]>([{ id: 'col-main', type: 'ALL', label: t('common.all') }]);
  const [mainColOverride, setMainColOverride] = useState<MainMovementFilter | null>(null);

  const columnsContainerRef = useRef<HTMLDivElement>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<DragFilterData | null>(null);

  const [selectedMovement, setSelectedMovement] = useState<MovementResponse | null>(null);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({ id: 'board' });

  const hasExpenseCol = columns.some(c => c.id !== 'col-main' && c.type === 'EXPENSE');
  const hasIncomeCol = columns.some(c => c.id !== 'col-main' && c.type === 'INCOME');

  const effectiveMainType = useMemo(() => {
    if (mainColOverride) return mainColOverride;
    if (hasExpenseCol) return 'INCOME';
    if (hasIncomeCol) return 'EXPENSE';
    return 'ALL';
  }, [mainColOverride, hasExpenseCol, hasIncomeCol]);

  const addColumn = (id: string, type: HistoryFilterType, label: string) => {
    if (columns.length >= 4) return;
    if (columns.some(c => c.id === id)) return;

    const newCol = {
      id,
      type,
      label,
      categoryId: id.startsWith('cat-') ? Number(id.replace('cat-', '')) : undefined
    };

    setColumns(prev => [...prev, newCol]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    const data = event.active.data.current;
    setActiveDragData(
      typeof data?.label === 'string' && isHistoryFilterType(data.type)
        ? { label: data.label, type: data.type }
        : null
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active, delta } = event;
    setActiveDragId(null);
    setActiveDragData(null);

    const isOverBoard = Boolean(over && (over.id === 'board' || over.id.toString().startsWith('col-')));
    const isDraggedRight = delta.x > 80;

    const data = active.data.current;
    if (
      (isOverBoard || isDraggedRight)
      && columns.length < 4
      && typeof data?.label === 'string'
      && isHistoryFilterType(data.type)
    ) {
      addColumn(String(active.id), data.type, data.label);
    }
  };

  useEffect(() => {
    if (columnsContainerRef.current) {
      const lastChild = columnsContainerRef.current.lastElementChild;
      if (lastChild && columns.length > 1) {
        gsap.fromTo(lastChild,
          { opacity: 0, x: 50, scale: 0.95 },
          { opacity: 1, x: 0, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
        );
      }
    }
  }, [columns.length]);

  const pageContainerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (pageContainerRef.current) {
      const mainElements = pageContainerRef.current.children;
      gsap.fromTo(
        mainElements,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)' }
      );
    }
  }, []);

  const removeColumn = (id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const getMovementsForColumn = (col: HistoryColumn) => {
    let list = movements;

    if (selectedDate) {
      list = list.filter(m => {
        const d = m.date ? m.date.substring(0, 10) : m.createdAt?.substring(0, 10);
        return d === selectedDate;
      });
    }

    if (col.id === 'col-main') {
      if (effectiveMainType === 'ALL') return list;
      return list.filter(m => m.type === effectiveMainType);
    }
    if (col.type === 'EXPENSE') return list.filter(m => m.type === 'EXPENSE');
    if (col.type === 'INCOME') return list.filter(m => m.type === 'INCOME');
    if (col.type === 'CATEGORY') return list.filter(m => m.categoryId === col.categoryId);
    return list;
  };

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return null;
    try {
      return format(parseISO(selectedDate), language === 'en' ? 'MMMM d, yyyy' : "d 'de' MMMM, yyyy", { locale: language === 'en' ? enUS : es });
    } catch {
      return selectedDate;
    }
  }, [language, selectedDate]);

  const mainSwitchOptions = useMemo<Array<{ id: MainMovementFilter; label: string }>>(() => {
    if (hasExpenseCol) return [{ id: 'ALL', label: t('common.all') }, { id: 'INCOME', label: t('common.income') }];
    if (hasIncomeCol) return [{ id: 'ALL', label: t('common.all') }, { id: 'EXPENSE', label: t('common.expenses') }];
    return [{ id: 'ALL', label: t('common.all') }, { id: 'INCOME', label: t('common.income') }, { id: 'EXPENSE', label: t('common.expenses') }];
  }, [hasExpenseCol, hasIncomeCol, t]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={pageContainerRef} className="space-y-6 flex flex-col h-full overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{t('history.title')}</h1>
            <p className="text-neutral-500 dark:text-neutral-400">{t('history.subtitle')}</p>
          </div>

          {selectedDateLabel && (
            <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-2xl text-sm font-semibold shadow-sm">
              <CalendarIcon className="w-4 h-4 text-primary-500 dark:text-primary-400" />
              <span>Día: {selectedDateLabel}</span>
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-2 hover:bg-primary-100 dark:hover:bg-primary-900 p-1 rounded-full text-primary-600 dark:text-primary-300 transition-colors"
                title={t('history.clearDateFilter')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-6 h-full min-h-[500px]">
          <div className="w-[280px] shrink-0 space-y-4 flex flex-col">
            <CalendarWidget
              movements={movements}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              language={language}
            />

            <Card className="p-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">{t('history.filters')}</h3>

              <div className="flex flex-wrap gap-1.5">
                {!hasIncomeCol && (
                  <DraggableFilter
                    id="filter-income"
                    label={t('common.income')}
                    type="INCOME"
                    onAdd={() => addColumn('filter-income', 'INCOME', t('common.income'))}
                  />
                )}
                {!hasExpenseCol && (
                  <DraggableFilter
                    id="filter-expense"
                    label={t('common.expenses')}
                    type="EXPENSE"
                    onAdd={() => addColumn('filter-expense', 'EXPENSE', t('common.expenses'))}
                  />
                )}
              </div>

              <div className="border-t border-neutral-100 dark:border-neutral-700/60 my-3 pt-3">
                <span className="text-xs text-neutral-400 font-semibold uppercase block mb-2">{t('history.categories')}</span>
                <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <DraggableFilter
                      key={cat.id}
                      id={`cat-${cat.id}`}
                      label={cat.name}
                      type="CATEGORY"
                      color={cat.color}
                      onAdd={() => addColumn(`cat-${cat.id}`, 'CATEGORY', cat.name)}
                    />
                  ))}
                </div>
              </div>
            </Card>
          </div>

          <div
            ref={setDroppableRef}
            className={`flex-1 flex gap-6 overflow-x-auto pb-4 px-4 pt-2 -mx-4 rounded-3xl transition-colors min-h-[450px] ${isOver ? 'bg-primary-50 dark:bg-primary-950/40 border-2 border-dashed border-primary-200 dark:border-primary-800' : 'bg-transparent'}`}
          >
            {isLoading ? (
              <div className="text-neutral-500 dark:text-neutral-400 animate-pulse w-full text-center mt-12">{t('history.loading')}</div>
            ) : (
              <div ref={columnsContainerRef} className="flex gap-6 h-full items-start w-full min-w-max">
                {columns.map((col, index) => (
                  <MovementList
                    key={col.id}
                    title={col.label}
                    headerContent={col.id === 'col-main' ? (
                      <div className="flex gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-xs font-semibold">
                        {mainSwitchOptions.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMainColOverride(opt.id)}
                            className={`px-3 py-1 rounded-lg transition-colors ${effectiveMainType === opt.id ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    ) : undefined}
                    movements={getMovementsForColumn(col)}
                    isRemovable={index !== 0}
                    onClose={() => removeColumn(col.id)}
                    onMovementClick={(mov, e) => {
                      captureTrigger(e);
                      setSelectedMovement(mov);
                    }}
                  />
                ))}

                {columns.length < 4 && isOver && (
                  <div className="flex-1 min-w-[300px] max-w-[400px] rounded-3xl border-2 border-dashed border-primary-300 bg-primary-100/50 flex items-center justify-center text-primary-500 font-semibold h-[200px]">
                    {t('history.dropToCreate')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay className="pointer-events-none">
        {activeDragId ? (
          <div className="opacity-90 scale-105 shadow-2xl rotate-3 pointer-events-none">
            <Badge
              variant="outline"
              className="bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white border-2 border-primary-500 shadow-lg py-1 px-2.5 rounded-xl"
            >
              <span className="flex items-center gap-1 font-semibold text-[11px]">
                <GripVertical className="w-3 h-3 opacity-50" />
                {activeDragData?.label}
              </span>
            </Badge>
          </div>
        ) : null}
      </DragOverlay>

      <EditMovementModal
        isOpen={!!selectedMovement}
        onClose={() => setSelectedMovement(null)}
        movement={selectedMovement}
        triggerRect={triggerRect}
      />
    </DndContext>
  );
}
