import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Inbox } from 'lucide-react';
import apiClient from '../../api/apiClient';
import { invalidateDomains, privateQueryKey } from '../../api/queryCache';
import { useAuth } from '../../contexts/authContextValue';
import { useI18n } from '../../i18n/i18nContextValue';

type Draft = { id: string; amount: number; currency: string; occurredAt: string };

export function EmailDraftsPanel() {
  const { language } = useI18n();
  const en = language === 'en';
  const { user } = useAuth();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const key = privateQueryKey(user?.id, ['expense-drafts']);
  const query = useQuery({
    queryKey: key,
    enabled: open && Boolean(user),
    refetchInterval: open ? 15000 : false,
    queryFn: async ({ signal }) => {
      const [drafts, review] = await Promise.all([
        apiClient.get<Draft[]>('/expense-drafts', { signal }),
        apiClient.get<{ count: number }>('/expense-drafts/review-count', { signal }),
      ]);
      return { drafts: drafts.data, review: review.data.count };
    },
  });

  async function resolve(draft: Draft, action: 'approve' | 'discard') {
    setBusy(true);
    setError(false);
    try {
      await apiClient.post(`/expense-drafts/${draft.id}/${action}`, action === 'approve'
        ? { amount: draft.amount, date: draft.occurredAt } : undefined);
      await client.invalidateQueries({ queryKey: key });
      if (action === 'approve') await invalidateDomains(client, ['movements', 'dashboard', 'budgets']);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="shrink-0 space-y-2">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700">
        <Inbox size={16} aria-hidden="true" />
        {en ? 'Email drafts' : 'Borradores de correo'}
      </button>
      {open && <div className="max-h-44 space-y-2 overflow-y-auto text-sm">
        {query.isPending && <p role="status">{en ? 'Loading drafts…' : 'Cargando borradores…'}</p>}
        {(error || query.isError) && <p role="alert">{en ? 'Could not complete the request.' : 'No se pudo completar la solicitud.'}</p>}
        {query.data?.drafts.length === 0 && <p>{en ? 'No pending drafts.' : 'No hay borradores pendientes.'}</p>}
        {!!query.data?.review && <p>{en ? 'Emails needing review:' : 'Correos que requieren revisión:'} {query.data.review}</p>}
        {query.data?.drafts.map((draft) => (
          <div key={draft.id} className="flex flex-wrap items-center gap-3 border-b border-neutral-200 py-2 dark:border-neutral-700">
            <span className="font-medium">{draft.currency} {draft.amount.toFixed(2)}</span>
            <time dateTime={draft.occurredAt}>{draft.occurredAt.replace('T', ' ').slice(0, 16)}</time>
            <button type="button" disabled={busy} onClick={() => void resolve(draft, 'approve')}
              className="rounded-md border px-2 py-1 disabled:opacity-50">{en ? 'Approve' : 'Aprobar'}</button>
            <button type="button" disabled={busy} onClick={() => void resolve(draft, 'discard')}
              className="rounded-md border px-2 py-1 disabled:opacity-50">{en ? 'Discard' : 'Descartar'}</button>
          </div>
        ))}
      </div>}
    </section>
  );
}
