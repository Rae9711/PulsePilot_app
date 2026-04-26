import React from 'react';
import { Insight } from '../types/index';

interface InsightCardProps {
  insight: Insight;
  onDismiss?: (insightId: string) => void;
}

const priorityClasses = {
  high: 'border-rose-300 bg-rose-50 text-rose-900',
  medium: 'border-amber-300 bg-amber-50 text-amber-900',
  low: 'border-emerald-300 bg-emerald-50 text-emerald-900',
} as const;

const categoryBadge = {
  energy: 'bg-sky-100 text-sky-800',
  stress: 'bg-rose-100 text-rose-800',
  nutrition: 'bg-emerald-100 text-emerald-800',
  recovery: 'bg-violet-100 text-violet-800',
  consistency: 'bg-slate-200 text-slate-800',
} as const;

export const InsightCard: React.FC<InsightCardProps> = ({ insight, onDismiss }) => {
  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${priorityClasses[insight.priority]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${categoryBadge[insight.category as keyof typeof categoryBadge] ?? 'bg-slate-100 text-slate-800'}`}>
            {insight.category}
          </span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            {insight.priority} priority
          </span>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            className="rounded-full border border-current/20 px-3 py-1 text-xs font-medium transition hover:bg-white/70"
          >
            Dismiss
          </button>
        )}
      </div>

      <h3 className="mt-4 text-xl font-semibold">{insight.title}</h3>
      <p className="mt-2 text-sm leading-6">{insight.summary}</p>

      {insight.bullets.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {insight.bullets.map((bullet) => (
            <li key={bullet} className="rounded-2xl bg-white/70 px-4 py-3">
              {bullet}
            </li>
          ))}
        </ul>
      )}

      {insight.stats.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {insight.stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/70 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">{stat.label.replace(/_/g, ' ')}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};