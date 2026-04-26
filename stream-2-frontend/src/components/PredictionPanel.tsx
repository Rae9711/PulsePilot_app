import React from 'react';
import { ForecastScenario, PredictionBundle } from '../types/index';

interface PredictionPanelProps {
  bundle: PredictionBundle;
}

const formatHour = (hour: number) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${suffix}`;
};

const scoreTone = (value: number, kind: 'scale' | 'probability', inverse = false) => {
  const normalized = kind === 'scale' ? value / 5 : value;
  if (!inverse) {
    if (normalized >= 0.7) {
      return 'text-emerald-700';
    }
    if (normalized >= 0.5) {
      return 'text-amber-700';
    }
    return 'text-rose-700';
  }

  if (normalized <= 0.35) {
    return 'text-emerald-700';
  }
  if (normalized <= 0.55) {
    return 'text-amber-700';
  }
  return 'text-rose-700';
};

const ScenarioCard: React.FC<{ scenario: ForecastScenario; emphasized?: boolean }> = ({ scenario, emphasized = false }) => (
  <article className={`rounded-3xl border p-5 shadow-sm ${emphasized ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{scenario.label}</div>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{formatHour(scenario.plannedHour)} {scenario.workoutKind}</h3>
        <p className="mt-2 text-sm text-slate-600">{scenario.description}</p>
      </div>
      <div className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {scenario.includeBreakfast ? 'Breakfast on' : 'Breakfast off'}
      </div>
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-white/80 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Post energy</div>
        <div className={`mt-2 text-2xl font-semibold ${scoreTone(scenario.predictions.expectedPostWorkoutEnergy.value, 'scale')}`}>
          {scenario.predictions.expectedPostWorkoutEnergy.value.toFixed(1)}/5
        </div>
        <div className="mt-1 text-xs text-slate-500">{scenario.predictions.expectedPostWorkoutEnergy.confidenceLabel} confidence</div>
      </div>
      <div className="rounded-2xl bg-white/80 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Post stress</div>
        <div className={`mt-2 text-2xl font-semibold ${scoreTone(scenario.predictions.expectedPostWorkoutStress.value, 'scale', true)}`}>
          {scenario.predictions.expectedPostWorkoutStress.value.toFixed(1)}/5
        </div>
        <div className="mt-1 text-xs text-slate-500">{scenario.predictions.expectedPostWorkoutStress.confidenceLabel} confidence</div>
      </div>
      <div className="rounded-2xl bg-white/80 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Good session</div>
        <div className={`mt-2 text-2xl font-semibold ${scoreTone(scenario.predictions.goodSessionLikelihood.value, 'probability')}`}>
          {Math.round(scenario.predictions.goodSessionLikelihood.value * 100)}%
        </div>
        <div className="mt-1 text-xs text-slate-500">EMA + Bayesian + logistic + boosted trees</div>
      </div>
      <div className="rounded-2xl bg-white/80 px-4 py-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Next-day recovery</div>
        <div className={`mt-2 text-2xl font-semibold ${scoreTone(scenario.predictions.nextDayRecoveryQuality.value, 'probability')}`}>
          {Math.round(scenario.predictions.nextDayRecoveryQuality.value * 100)}%
        </div>
        <div className="mt-1 text-xs text-slate-500">{scenario.predictions.nextDayRecoveryQuality.sampleCount} labeled next-day samples</div>
      </div>
    </div>
  </article>
);

export const PredictionPanel: React.FC<PredictionPanelProps> = ({ bundle }) => {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Prediction engine</div>
            <h2 className="mt-2 text-3xl font-semibold text-slate-900">{bundle.narrative.headline}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{bundle.narrative.coachSummary}</p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Hybrid model mix</div>
            <div className="mt-2">Personal weight: {Math.round(bundle.modelNotes.personalWeight * 100)}%</div>
            <div>Global weight: {Math.round(bundle.modelNotes.globalWeight * 100)}%</div>
            <div className="mt-2 text-xs text-slate-500">{bundle.modelNotes.calibrationNote}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Top priorities</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {bundle.narrative.priorities.map((priority) => (
                <li key={priority} className="rounded-2xl bg-white px-4 py-3">{priority}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Next actions</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {bundle.narrative.nextActions.map((action) => (
                <li key={action} className="rounded-2xl bg-white px-4 py-3">{action}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Check-in questions</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {bundle.narrative.checkInQuestions.map((question) => (
                <li key={question} className="rounded-2xl bg-white px-4 py-3">{question}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <ScenarioCard scenario={bundle.defaultScenario} emphasized />

      <div className="grid gap-4 xl:grid-cols-3">
        {bundle.scenarioComparisons.map((scenario) => (
          <ScenarioCard key={scenario.id} scenario={scenario} />
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900">Personalized heuristics</h3>
          <p className="mt-2 text-sm text-slate-500">Stage 1 signals that feed the forecast engine: timing, mood shifts, meal timing, and consistency, all using rolling 7/30/90/180-day windows with recency weighting.</p>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {bundle.heuristics.map((heuristic) => (
            <article key={heuristic.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{heuristic.category}</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{heuristic.confidenceLabel} confidence</span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{heuristic.windowDays}d window</span>
              </div>
              <h4 className="mt-4 text-xl font-semibold text-slate-900">{heuristic.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">{heuristic.summary}</p>
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-700">{heuristic.recommendation}</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {heuristic.evidence.map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{item.label.replace(/_/g, ' ')}</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};