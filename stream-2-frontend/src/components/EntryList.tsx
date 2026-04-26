import React from 'react';
import { Entry } from '../types/index';
import { useLanguage } from '../context/LanguageContext';

interface EntryListProps {
  entries: Entry[];
  onSelectEntry?: (entry: Entry) => void;
  isLoading?: boolean;
  onDeleteEntry?: (entryId: string) => void;
}

const formatDate = (dateString: string, locale: string) =>
  new Date(dateString).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const getStatus = (entry: Entry, zh: boolean) => {
  const pre = entry.feelings?.find((feeling) => feeling.when === 'pre');
  const post = entry.feelings?.find((feeling) => feeling.when === 'post');
  if (!pre || !post) {
    return { label: zh ? '未完成' : 'Incomplete', className: 'bg-slate-100 text-slate-700' };
  }

  const score = (post.valence - pre.valence) + (post.energy - pre.energy) + (pre.stress - post.stress);
  if (score >= 2) {
    return { label: zh ? '改善' : 'Improved', className: 'bg-emerald-100 text-emerald-800' };
  }
  if (score <= -1) {
    return { label: zh ? '变差' : 'Worse', className: 'bg-rose-100 text-rose-800' };
  }
  return { label: zh ? '混合' : 'Mixed', className: 'bg-amber-100 text-amber-800' };
};

export const EntryList: React.FC<EntryListProps> = ({
  entries,
  onSelectEntry,
  isLoading = false,
  onDeleteEntry,
}) => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const locale = zh ? 'zh-CN' : 'en-US';

  if (isLoading) {
    return <div className="text-center text-slate-500">{zh ? '正在加载记录...' : 'Loading entries...'}</div>;
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        {zh ? '当前筛选条件下没有记录。' : 'No entries match the current filters.'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        const pre = entry.feelings?.find((feeling) => feeling.when === 'pre');
        const post = entry.feelings?.find((feeling) => feeling.when === 'post');
        const status = getStatus(entry, zh);
        return (
          <article
            key={entry.id}
            onClick={() => onSelectEntry?.(entry)}
            className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${onSelectEntry ? 'cursor-pointer hover:border-sky-300' : ''}`}
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {entry.type === 'meal' ? (zh ? '饮食' : 'meal') : (zh ? '训练' : 'workout')}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{entry.raw_text}</h3>
                <p className="mt-1 text-sm text-slate-500">{formatDate(entry.occurred_at, locale)}</p>
              </div>
              {onDeleteEntry && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteEntry(entry.id);
                  }}
                  className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
                >
                  {zh ? '删除' : 'Delete'}
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{zh ? '之前' : 'Before'}</div>
                <div className="mt-2">{zh ? '心情' : 'Mood'} {pre?.valence ?? '-'} / {zh ? '精力' : 'Energy'} {pre?.energy ?? '-'} / {zh ? '压力' : 'Stress'} {pre?.stress ?? '-'}</div>
                {pre?.notes && <div className="mt-2 text-slate-500">{pre.notes}</div>}
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{zh ? '之后' : 'After'}</div>
                <div className="mt-2">{zh ? '心情' : 'Mood'} {post?.valence ?? '-'} / {zh ? '精力' : 'Energy'} {post?.energy ?? '-'} / {zh ? '压力' : 'Stress'} {post?.stress ?? '-'}</div>
                {post?.notes && <div className="mt-2 text-slate-500">{post.notes}</div>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};