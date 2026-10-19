import { useState, useRef } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useCategories } from '../../hooks/useCategories';
import type { CategoryResponse } from '../../types/category.types';
import { getCategoryBadgeStyle } from '../../utils/categoryStyle';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../../i18n/i18nContextValue';
import { getApiErrorMessage } from '../../utils/apiError';
import { getLocalStorageItem, setLocalStorageItem } from '../../utils/browserStorage';

const COLOR_FAMILIES = [
  { key: 'colorGreen', colors: ['#10B981', '#059669', '#047857', '#34D399', '#6EE7B7', '#14B8A6', '#0D9488', '#16A34A', '#15803D'] },
  { key: 'colorAmber', colors: ['#F59E0B', '#D97706', '#B45309', '#FBBF24', '#FCD34D', '#EAB308', '#CA8A04', '#A16207', '#78350F'] },
  { key: 'colorOrange', colors: ['#F97316', '#EA580C', '#C2410C', '#FB923C', '#FDBA74', '#ED8936', '#DD6B20', '#C05621', '#9A3412'] },
  { key: 'colorRed', colors: ['#EF4444', '#DC2626', '#B91C1C', '#F87171', '#F43F5E', '#E11D48', '#BE123C', '#FB7185', '#9F1239'] },
  { key: 'colorPurple', colors: ['#A855F7', '#9333EA', '#7E22CE', '#C084FC', '#8B5CF6', '#7C3AED', '#6D28D9', '#E879F9', '#D946EF'] },
  { key: 'colorBlue', colors: ['#3B82F6', '#2563EB', '#1D4ED8', '#60A5FA', '#0284C7', '#0369A1', '#06B6D4', '#0891B2', '#1E40AF'] },
  { key: 'colorGray', colors: ['#64748B', '#475569', '#334155', '#94A3B8', '#71717A', '#52525B', '#3F3F46', '#78716C', '#57534E'] },
];

const EMOJI_DICTIONARY: Record<string, string[]> = {
  '\u{1F354}': ['comida', 'food', 'hamburguesa', 'burger', 'restaurante', 'restaurant', 'almuerzo', 'lunch', 'cena', 'dinner'],
  '\u{1F355}': ['pizza', 'pizzeria', 'italiana', 'queso'],
  '\u{2615}': ['cafe', 'coffee', 'cafeteria', 'desayuno', 'tea', 'te'],
  '\u{1F6D2}': ['compras', 'shopping', 'super', 'mercado', 'supermercado', 'groceries', 'tienda'],
  '\u{1F695}': ['taxi', 'uber', 'didi', 'cabify', 'pasaje'],
  '\u{1F697}': ['auto', 'car', 'coche', 'gasolina', 'combustible', 'parking', 'peaje'],
  '\u{1F68C}': ['transporte', 'transport', 'bus', 'micro', 'metro'],
  '\u{2708}\u{FE0F}': ['viaje', 'travel', 'vuelo', 'vacaciones', 'hotel', 'turismo'],
  '\u{1F3E0}': ['casa', 'house', 'hogar', 'home', 'renta', 'alquiler', 'hipoteca'],
  '\u{1F4A1}': ['luz', 'electricidad', 'energia', 'servicio'],
  '\u{1F4A7}': ['agua', 'water'],
  '\u{1F4F6}': ['internet', 'wifi', 'cable', 'fibra'],
  '\u{1F4F1}': ['telefono', 'phone', 'celular', 'movil', 'recarga'],
  '\u{1F3AE}': ['videojuegos', 'gaming', 'game', 'playstation', 'xbox', 'nintendo'],
  '\u{1F3AC}': ['cine', 'movies', 'peliculas', 'netflix', 'streaming'],
  '\u{1F3B5}': ['musica', 'music', 'spotify', 'concierto', 'evento'],
  '\u{1F381}': ['regalos', 'gifts', 'cumpleanos', 'birthday', 'present', 'obsequio'],
  '\u{1F48A}': ['farmacia', 'medicina', 'salud', 'health'],
  '\u{1FA7A}': ['doctor', 'medico', 'hospital', 'clinica', 'dentista'],
  '\u{1F3CB}\u{FE0F}': ['gimnasio', 'gym', 'deporte', 'sports', 'fitness'],
  '\u{1F436}': ['mascota', 'pet', 'perro', 'dog', 'gato', 'cat', 'veterinaria'],
  '\u{1F488}': ['barberia', 'peluqueria', 'corte', 'beauty', 'spa'],
  '\u{1F4B0}': ['salario', 'salary', 'sueldo', 'ingreso', 'income', 'bono'],
  '\u{1F4B5}': ['efectivo', 'cash', 'ahorro', 'savings', 'ganancia'],
  '\u{1F4B3}': ['tarjeta', 'banco', 'bank', 'debito', 'credito'],
  '\u{1F4C9}': ['deudas', 'prestamo', 'loan', 'impuesto', 'tax'],
  '\u{1F4DA}': ['libros', 'books', 'educacion', 'curso', 'universidad', 'estudios'],
  '\u{1F455}': ['ropa', 'clothes', 'moda', 'zapatillas', 'shoes'],
  '\u{1F4BB}': ['tecnologia', 'tech', 'laptop', 'computadora', 'software'],
};

const ALL_EMOJIS = Array.from(new Set(Object.keys(EMOJI_DICTIONARY)));

function normalizeText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

const USER_EMOJI_MEMORY_KEY = 'equio_user_emoji_memory';

function getUserEmojiMemory(): Record<string, string> {
  try {
    const data = getLocalStorageItem(USER_EMOJI_MEMORY_KEY);
    const parsed: unknown = data ? JSON.parse(data) : {};
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    const safeMemory: Record<string, string> = Object.create(null);
    for (const [keyword, emoji] of Object.entries(parsed).slice(-100)) {
      if (keyword.length <= 50
          && typeof emoji === 'string'
          && ALL_EMOJIS.includes(emoji)) {
        safeMemory[keyword] = emoji;
      }
    }
    return safeMemory;
  } catch {
    return {};
  }
}

function saveUserEmojiMemory(keyword: string, emoji: string) {
  const normKey = normalizeText(keyword);
  if (!normKey) return;
  const memory = getUserEmojiMemory();
  memory[normKey] = emoji;
  const keys = Object.keys(memory);
  if (keys.length > 100) {
    delete memory[keys[0]];
  }
  setLocalStorageItem(USER_EMOJI_MEMORY_KEY, JSON.stringify(memory));
}

function suggestEmoji(name: string): string {
  const normalizedInput = normalizeText(name);
  if (!normalizedInput) return '\u{1F4C1}';

  const words = normalizedInput.split(/\s+/).filter(Boolean);
  const userMemory = getUserEmojiMemory();
  if (userMemory[normalizedInput]) return userMemory[normalizedInput];

  for (const word of words) {
    if (userMemory[word]) return userMemory[word];
  }

  let bestMatchEmoji = '\u{1F4C1}';
  let highestScore = 0;
  for (const [emoji, keywords] of Object.entries(EMOJI_DICTIONARY)) {
    const normalizedKeywords = keywords.map(normalizeText);
    for (const word of words) {
      for (const keyword of normalizedKeywords) {
        if (word === keyword && highestScore < 4) {
          highestScore = 4;
          bestMatchEmoji = emoji;
        } else if ((keyword.startsWith(word) || word.startsWith(keyword)) && highestScore < 3) {
          highestScore = 3;
          bestMatchEmoji = emoji;
        } else if (word.length >= 4 && keyword.length >= 4) {
          const distance = levenshteinDistance(word, keyword);
          const maxLength = Math.max(word.length, keyword.length);
          if (distance <= 2 && distance / maxLength <= 0.35 && highestScore < 2) {
            highestScore = 2;
            bestMatchEmoji = emoji;
          }
        } else if (normalizedInput.includes(keyword) && highestScore < 1) {
          highestScore = 1;
          bestMatchEmoji = emoji;
        }
      }
    }
  }
  return bestMatchEmoji;
}

interface NewCategoryFormProps {
  onSuccess: (category: CategoryResponse) => void;
  onCancel?: () => void;
  categoryToEdit?: CategoryResponse | null;
}

export function NewCategoryForm({ onSuccess, categoryToEdit }: NewCategoryFormProps) {
  const { t } = useI18n();
  const [initialStyle] = useState(() => {
    const matchingFamily = categoryToEdit?.color
      ? COLOR_FAMILIES.findIndex((family) => family.colors.includes(categoryToEdit.color!))
      : -1;
    const familyIndex = matchingFamily >= 0
      ? matchingFamily
      : Math.floor(Math.random() * COLOR_FAMILIES.length);
    const colors = COLOR_FAMILIES[familyIndex].colors;
    return {
      familyIndex,
      color: categoryToEdit?.color ?? colors[Math.floor(Math.random() * colors.length)],
    };
  });
  const [activeColorFamily, setActiveColorFamily] = useState(initialStyle.familyIndex);
  const [color, setColor] = useState(initialStyle.color);
  const [name, setName] = useState(categoryToEdit?.name || '');
  const [icon, setIcon] = useState(categoryToEdit?.icon || '\u{1F4C1}');
  const [isManualIcon, setIsManualIcon] = useState(!!categoryToEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { categories, createCategory, updateCategory, refetch } = useCategories();
  const formRef = useRef<HTMLFormElement>(null);

  const effectiveIcon = isManualIcon ? icon : suggestEmoji(name);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    const isDuplicate = categories.some(cat => cat.name.trim().toLowerCase() === cleanName.toLowerCase() && cat.id !== categoryToEdit?.id);
    if (isDuplicate) {
      setSubmitError(t('categories.duplicate', { name: cleanName }));
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      saveUserEmojiMemory(cleanName, effectiveIcon);
      const catResult = categoryToEdit
        ? await updateCategory({ id: categoryToEdit.id, data: { name: cleanName, color, icon: effectiveIcon } })
        : await createCategory({ name: cleanName, color, icon: effectiveIcon });
      await refetch();
      onSuccess(catResult);
    } catch (error: unknown) {
      const fallback = categoryToEdit ? t('categories.updateError') : t('categories.createError');
      setSubmitError(getApiErrorMessage(error, fallback, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  const colorFamilyName = t(`categories.${COLOR_FAMILIES[activeColorFamily].key}`);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mt-2 flex flex-col gap-5">
      <Input label={t('categories.nameLabel')} placeholder={t('categories.nameExample')} value={name} onChange={(e) => { const value = e.target.value; setName(value); if (!value.trim()) setIsManualIcon(false); setSubmitError(null); }} maxLength={50} required />

      {submitError && <div className="p-3 rounded-xl bg-tertiary-50 text-tertiary-600 dark:bg-tertiary-950/35 dark:text-tertiary-300 text-xs font-semibold">{submitError}</div>}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">{t('categories.iconLabel')}</label>
          <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="text-xs text-primary-600 font-semibold hover:underline">
            {showEmojiPicker ? t('categories.closeGrid') : t('categories.viewAllIcons')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="w-14 h-14 rounded-2xl border flex items-center justify-center text-3xl hover:scale-105 transition-all shrink-0 shadow-sm" onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={getCategoryBadgeStyle(color)}>
            {effectiveIcon}
          </button>

          <div className="flex-1 bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-2 border border-neutral-200 dark:border-neutral-700 max-h-24 overflow-y-auto">
            <div className="grid grid-cols-7 gap-1.5 items-center justify-items-center">
              {(showEmojiPicker ? ALL_EMOJIS : ALL_EMOJIS.slice(0, 14)).map(emoji => (
                <button key={emoji} type="button" className={`text-base p-1 rounded-lg transition-transform hover:scale-125 flex items-center justify-center ${effectiveIcon === emoji ? 'bg-white dark:bg-neutral-800 shadow-sm ring-2 ring-primary-500' : 'hover:bg-neutral-200/60 dark:hover:bg-neutral-800'}`} onClick={() => { setIcon(emoji); setIsManualIcon(true); if (name.trim()) saveUserEmojiMemory(name, emoji); setShowEmojiPicker(false); }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">{t('categories.color')} ({colorFamilyName})</label>
          <span className="text-xs font-medium text-neutral-400">{activeColorFamily + 1} {t('categories.of')} {COLOR_FAMILIES.length}</span>
        </div>

        <div className="flex items-center gap-2 bg-neutral-50 dark:bg-neutral-900 p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700">
          <button type="button" onClick={() => setActiveColorFamily(prev => (prev > 0 ? prev - 1 : COLOR_FAMILIES.length - 1))} className="p-1 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors" title={t('categories.previousFamily')}>
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 grid grid-cols-9 gap-1.5 items-center justify-items-center">
            {COLOR_FAMILIES[activeColorFamily].colors.map((currentColor, index) => (
              <button key={`${currentColor}-${index}`} type="button" className={`w-7 h-7 rounded-full shadow-sm transition-all hover:scale-110 flex items-center justify-center ${color === currentColor ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''}`} style={{ backgroundColor: currentColor }} onClick={() => setColor(currentColor)} />
            ))}
          </div>

          <button type="button" onClick={() => setActiveColorFamily(prev => (prev < COLOR_FAMILIES.length - 1 ? prev + 1 : 0))} className="p-1 rounded-xl text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-800 transition-colors" title={t('categories.nextFamily')}>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Button type="submit" variant="primary" className="w-full py-3.5 font-semibold" isLoading={isSubmitting}>
        {categoryToEdit ? t('common.saveChanges') : t('common.createCategory')}
      </Button>
    </form>
  );
}
