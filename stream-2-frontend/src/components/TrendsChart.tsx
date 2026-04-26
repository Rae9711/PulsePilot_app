import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendsData } from '../types/index';
import { useLanguage } from '../context/LanguageContext';

interface TrendsChartProps {
  data: TrendsData;
  weightData?: Array<{ date: string; weightKg: number }>;
  onMetricChange?: (metric: string) => void;
  onWindowChange?: (days: number) => void;
  isLoading?: boolean;
}

export const TrendsChart: React.FC<TrendsChartProps> = ({
  data,
  weightData = [],
  onMetricChange,
  onWindowChange,
  isLoading = false,
}) => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const windows = [7, 30, 90, 365];
  const metricMeta: Record<string, { label: string; description: string }> = {
    'post-energy': {
      label: zh ? '训练后精力' : 'Post-workout energy',
      description: zh ? '你在训练后感觉多有精力，越高越好。' : 'How energized you feel after a workout. Higher is better.',
    },
    'post-valence': {
      label: zh ? '训练后心情' : 'Post-workout mood',
      description: zh ? '你在训练后心情的积极程度，越高越好。' : 'How positive your mood feels after a workout. Higher is better.',
    },
    'post-stress': {
      label: zh ? '训练后压力' : 'Post-workout stress',
      description: zh ? '你在训练后感受到的压力，越低越好。' : 'How stressed you feel after a workout. Lower is better.',
    },
  };
  const activeMetricMeta = metricMeta[data.metric] ?? {
    label: data.metric,
    description: zh ? '基于你记录的训练后感受评分趋势。' : 'Trend based on your logged post-workout feeling score.',
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center rounded-3xl bg-slate-50">
        <div className="text-center text-slate-500">{zh ? '正在加载趋势...' : 'Loading trends...'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{zh ? '指标趋势' : 'Metric trends'}</h2>
          <p className="text-sm text-slate-500">{zh ? '将近期分数与个人基线对比。所有感受指标均为 1-5 分。' : 'Compare your recent scores against your own baseline. All feeling metrics use a 1-5 scale.'}</p>
          <div className="mt-2 inline-flex rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs text-sky-900">
            <span className="font-semibold mr-1">{activeMetricMeta.label}:</span> {activeMetricMeta.description}
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="text-sm text-slate-600">
            {zh ? '指标' : 'Metric'}
            <select
              onChange={(event) => onMetricChange?.(event.target.value)}
              value={data.metric}
              className="mt-2 block rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
            >
              {data.availableMetrics.map((metric) => (
                <option key={metric} value={metric}>
                  {metricMeta[metric]?.label ?? metric.replace('post-', '').replace('-', ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            {zh ? '窗口' : 'Window'}
            <select
              onChange={(event) => onWindowChange?.(parseInt(event.target.value, 10))}
              value={data.windowDays}
              className="mt-2 block rounded-2xl border border-slate-300 px-3 py-2 text-slate-900"
            >
              {windows.map((window) => (
                <option key={window} value={window}>
                  {zh ? `最近 ${window} 天` : `Last ${window} days`}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={data.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
            <YAxis domain={[0, 5]} tickCount={6} label={{ value: zh ? '评分 (1-5)' : 'Score (1-5)', angle: -90, position: 'insideLeft', offset: 8 }} />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  baseline: zh ? '你的基线' : 'Your baseline',
                  actual: zh ? '近期平均' : 'Recent average',
                  pre: zh ? '训练前' : 'Pre-workout',
                };
                return [Number(value).toFixed(2), labelMap[name] ?? name];
              }}
              labelFormatter={(label) => `${zh ? '日期' : 'Date'}: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="baseline" stroke="#0f172a" strokeWidth={2} dot={false} name={zh ? '你的基线' : 'Your baseline'} />
            <Line type="monotone" dataKey="actual" stroke="#0ea5e9" strokeWidth={2} dot={false} name={zh ? '近期平均' : 'Recent average'} />
            <Line type="monotone" dataKey="pre" stroke="#94a3b8" strokeDasharray="4 4" dot={false} name={zh ? '训练前' : 'Pre-workout'} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-slate-900">{zh ? '体重趋势' : 'Weight trend'}</h3>
          <p className="text-sm text-slate-500">{zh ? '你的体重记录随时间变化。' : 'Your logged body weight over time.'}</p>
        </div>
        {weightData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `${Number(value).toFixed(1)} kg`} />
              <Legend />
              <Line type="monotone" dataKey="weightKg" stroke="#14b8a6" strokeWidth={2} dot={false} name={zh ? '体重 (kg)' : 'Weight (kg)'} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            {zh ? '至少记录 2 条体重数据才能显示图表。' : 'Log at least 2 weight entries to render this chart.'}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {data.summaries.map((summary) => (
          <div key={summary.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm uppercase tracking-wide text-slate-500">{summary.label}</div>
            <div className="mt-3 text-3xl font-semibold text-slate-900">{summary.value}</div>
            <div className="mt-2 text-sm text-slate-500">{summary.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{zh ? '模式亮点' : 'Pattern highlights'}</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {data.patternHighlights.map((highlight) => (
              <li key={highlight} className="rounded-2xl bg-slate-50 px-4 py-3">
                {highlight}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">{zh ? '下一步建议检查' : 'Recommended next checks'}</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-600">
            {data.recommendations.map((recommendation) => (
              <li key={recommendation} className="rounded-2xl bg-slate-50 px-4 py-3">
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};