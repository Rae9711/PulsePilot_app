import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { TrendsChart } from '../components/TrendsChart';
import { useAppContext } from '../context/AppProvider';
import { useLanguage } from '../context/LanguageContext';
import { AnalyticsBundle, TrendMetricKey, TrendsData, WeightLog } from '../types/index';

const toneForSeverity = {
  opportunity: 'border-emerald-200 bg-emerald-50',
  stable: 'border-sky-200 bg-sky-50',
  watch: 'border-rose-200 bg-rose-50',
} as const;

export const Trends: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const navigate = useNavigate();
  const { userId, setLoading, setError } = useAppContext();
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<TrendMetricKey>('post-energy');
  const [selectedWindow, setSelectedWindow] = useState(30);
  const confidenceLabel = (value: string) => {
    if (!zh) return value;
    if (value === 'strong' || value === 'high') return '高';
    if (value === 'moderate' || value === 'medium') return '中';
    if (value === 'emerging' || value === 'low') return '低';
    return value;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [trends, analyticsBundle, fetchedWeight] = await Promise.all([
          apiClient.getTrends(userId, selectedWindow, selectedMetric),
          apiClient.getAnalytics(userId, selectedWindow),
          apiClient.getWeightLogs(180),
        ]);
        setTrendsData(trends);
        setAnalytics(analyticsBundle);
        setWeightLogs(fetchedWeight);
      } catch (error) {
        setError(zh ? '加载分析数据失败' : 'Failed to load analytics data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [selectedMetric, selectedWindow, setError, setLoading, userId, zh]);

  const weightData = [...weightLogs]
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime())
    .map((log) => ({
      date: new Date(log.loggedAt).toISOString().slice(0, 10),
      weightKg: log.weightKg,
    }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{zh ? '分析' : 'Analytics'}</h1>
          <p className="mt-2 text-slate-500">{zh ? '把你的日志转成可执行信号：趋势变化、证据支持的相关性、下一步动作与体重轨迹。' : 'Your logs translated into clear signals: trend behavior, evidence-backed correlations, next best actions, and weight trajectory.'}</p>
        </div>
        <button
          onClick={() => navigate('/log')}
          className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          {zh ? '再记一条' : 'Log another entry'}
        </button>
      </div>

      {trendsData && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            <span className="font-semibold">{zh ? '阅读说明：' : 'How to read this:'}</span> {zh ? '感受指标来自训练前后日志，评分 1-5。Baseline 表示历史典型水平；Recent average 表示当前窗口均值。' : 'Feeling metrics are scored 1-5 from your pre/post logs. Baseline = your typical level from past logs. Recent average = your current window trend.'}
          </div>
          <TrendsChart
            data={trendsData}
            weightData={weightData}
            onMetricChange={(metric) => setSelectedMetric(metric as TrendMetricKey)}
            onWindowChange={setSelectedWindow}
          />
        </section>
      )}

      {analytics && (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{zh ? '总览' : 'Overview'}</h2>
              <p className="text-sm text-slate-500">{zh ? '当前追踪窗口的精简快照。' : 'A compact snapshot of your recent tracked window.'}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{zh ? '追踪天数' : 'Tracked days'}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analytics.summary.trackedDays}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{zh ? '训练记录数' : 'Logged workouts'}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analytics.summary.loggedWorkouts}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{zh ? '完整样本数' : 'Complete samples'}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analytics.summary.completeWorkoutSamples}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm text-slate-500">{zh ? '窗口' : 'Window'}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{analytics.windowDays}d</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{zh ? '相关性分析' : 'Correlation analysis'}</h2>
              <p className="text-sm text-slate-500">{zh ? '当前窗口内最强的变量-结果关系。' : 'Strongest variable-to-outcome relationships in your selected window.'}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {analytics.correlations.slice(0, 3).map((correlation) => (
                <article key={correlation.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">{confidenceLabel(correlation.confidenceLabel)}</span>
                    <span className="text-sm text-slate-500">{zh ? `${correlation.sampleCount} 个样本` : `${correlation.sampleCount} samples`}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">{correlation.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{correlation.summary}</p>
                  <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{correlation.recommendation}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {correlation.evidence.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">{item.label.replace(/_/g, ' ')}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">{zh ? '下一步建议' : 'What to do next'}</h2>
              <p className="text-sm text-slate-500">{zh ? '当前最值得优先执行的教练信号。' : 'Top coaching signals to focus on right now.'}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-3">
              {analytics.predictiveInsights.slice(0, 3).map((insight) => (
                <article key={insight.id} className={`rounded-3xl border p-5 shadow-sm ${toneForSeverity[insight.severity]}`}>
                  <div className="flex items-center justify-between gap-4">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{insight.expectedWindow}</span>
                    <span className="text-sm text-slate-500">{confidenceLabel(insight.confidenceLabel)}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.summary}</p>
                  <div className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700">{insight.recommendation}</div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {insight.evidence.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-white/80 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-slate-500">{item.label.replace(/_/g, ' ')}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-900">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};