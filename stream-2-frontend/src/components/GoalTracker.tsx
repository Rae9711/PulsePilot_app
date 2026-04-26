import React, { useState } from 'react';
import { Goal, GoalDirection, GoalDraft, GoalMetric, GoalStatus } from '../types/index';

interface GoalTrackerProps {
  goals: Goal[];
  onCreateGoal: (input: GoalDraft) => Promise<void>;
  onUpdateGoal: (goalId: string, input: Partial<GoalDraft> & { status?: GoalStatus }) => Promise<void>;
}

const metricLabels: Record<GoalMetric, string> = {
  weekly_workouts: 'Weekly workouts',
  active_days: 'Active days',
  post_workout_energy: 'Post-workout energy',
  post_workout_stress: 'Post-workout stress',
  recovery_quality: 'Recovery quality',
};

const directionLabels: Record<GoalDirection, string> = {
  at_least: 'At least',
  at_most: 'At most',
};

const toneForStatus = (goal: Goal) => {
  if (goal.status === 'completed' || goal.isMet) {
    return 'border-emerald-200 bg-emerald-50';
  }
  if (goal.progress >= 0.66) {
    return 'border-sky-200 bg-sky-50';
  }
  return 'border-amber-200 bg-amber-50';
};

export const GoalTracker: React.FC<GoalTrackerProps> = ({ goals, onCreateGoal, onUpdateGoal }) => {
  const [draft, setDraft] = useState<GoalDraft>({
    title: '',
    metric: 'weekly_workouts',
    direction: 'at_least',
    targetValue: 4,
    windowDays: 7,
    note: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await onCreateGoal({
        ...draft,
        note: draft.note?.trim() || undefined,
      });
      setDraft({
        title: '',
        metric: 'weekly_workouts',
        direction: 'at_least',
        targetValue: 4,
        windowDays: 7,
        note: '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Goal setting</div>
        <h2 className="mt-2 text-2xl font-semibold text-slate-900">Goals and progress tracking</h2>
        <p className="mt-2 text-sm text-slate-500">Turn your strongest signals into explicit targets and track them against the same recent data window the analytics engine uses.</p>
      </div>

      <form className="grid gap-4 rounded-3xl bg-slate-50 p-5 lg:grid-cols-6" onSubmit={handleSubmit}>
        <label className="lg:col-span-2">
          <span className="text-sm font-medium text-slate-700">Goal title</span>
          <input
            required
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            placeholder="Train 4 times this week"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Metric</span>
          <select
            value={draft.metric}
            onChange={(event) => setDraft((current) => ({ ...current, metric: event.target.value as GoalMetric }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          >
            {Object.entries(metricLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Direction</span>
          <select
            value={draft.direction}
            onChange={(event) => setDraft((current) => ({ ...current, direction: event.target.value as GoalDirection }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          >
            {Object.entries(directionLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Target</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={draft.targetValue}
            onChange={(event) => setDraft((current) => ({ ...current, targetValue: Number(event.target.value) }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          />
        </label>
        <label>
          <span className="text-sm font-medium text-slate-700">Window</span>
          <select
            value={draft.windowDays}
            onChange={(event) => setDraft((current) => ({ ...current, windowDays: Number(event.target.value) }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </label>
        <label className="lg:col-span-5">
          <span className="text-sm font-medium text-slate-700">Note</span>
          <input
            value={draft.note}
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900"
            placeholder="Optional coaching note or hypothesis"
          />
        </label>
        <div className="lg:self-end">
          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : 'Create goal'}
          </button>
        </div>
      </form>

      <div className="grid gap-4 xl:grid-cols-2">
        {goals.map((goal) => (
          <article key={goal.id} className={`rounded-3xl border p-5 ${toneForStatus(goal)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{metricLabels[goal.metric]}</div>
                <h3 className="mt-2 text-xl font-semibold text-slate-900">{goal.title}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {directionLabels[goal.direction]} {goal.targetValue} over {goal.windowDays} days
                </p>
                {goal.note && <p className="mt-2 text-sm text-slate-500">{goal.note}</p>}
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
                {goal.status}
              </span>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Current: {goal.currentValue.toFixed(1)}</span>
                <span>{Math.round(goal.progress * 100)}%</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/80">
                <div className="h-full rounded-full bg-slate-900 transition-all" style={{ width: `${Math.max(8, goal.progress * 100)}%` }} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {goal.status !== 'completed' && (
                <button
                  onClick={() => onUpdateGoal(goal.id, { status: 'completed' })}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Mark completed
                </button>
              )}
              {goal.status !== 'archived' && (
                <button
                  onClick={() => onUpdateGoal(goal.id, { status: 'archived' })}
                  className="rounded-full border border-slate-300 bg-transparent px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  Archive
                </button>
              )}
            </div>
          </article>
        ))}

        {goals.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
            No goals yet. Create one from the signals above so the app can track the target against your recent data.
          </div>
        )}
      </div>
    </section>
  );
};