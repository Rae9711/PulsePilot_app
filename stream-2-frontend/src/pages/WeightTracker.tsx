import React, { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { apiClient } from '../api/client';
import { WeightLog } from '../types/index';
import { useLanguage } from '../context/LanguageContext';

const formatDate = (iso: string, locale: string) =>
  new Date(iso).toLocaleDateString(locale, { month: 'short', day: 'numeric' });

const todayInputDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const WeightTracker: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const locale = zh ? 'zh-CN' : 'en-US';

  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputKg, setInputKg] = useState('');
  const [inputDate, setInputDate] = useState(todayInputDate());
  const [inputNote, setInputNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getWeightLogs(90);
      setLogs(data.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()));
    } catch {
      setError(zh ? '加载体重历史失败。' : 'Failed to load weight history.');
    } finally {
      setLoading(false);
    }
  }, [zh]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const kg = parseFloat(inputKg);
    if (!kg || kg <= 0 || kg > 500) {
      setError(zh ? '请输入有效体重（0-500 kg）。' : 'Please enter a valid weight (0-500 kg).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const loggedAt = `${inputDate}T12:00:00.000Z`;
      await apiClient.logWeight(kg, loggedAt, inputNote || undefined);
      setInputKg('');
      setInputDate(todayInputDate());
      setInputNote('');
      await fetchLogs();
    } catch {
      setError(zh ? '保存体重记录失败。' : 'Failed to save weight entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.deleteWeightLog(id);
      await fetchLogs();
    } catch {
      setError(zh ? '删除记录失败。' : 'Failed to delete entry.');
    }
  };

  const latestWeight = logs.length ? logs[logs.length - 1].weightKg : null;
  const startWeight = logs.length ? logs[0].weightKg : null;
  const totalChange = latestWeight !== null && startWeight !== null ? latestWeight - startWeight : null;

  const chartData = logs.map((log) => ({
    date: formatDate(log.loggedAt, locale),
    weight: log.weightKg,
  }));

  const allWeights = logs.map((l) => l.weightKg);
  const yMin = allWeights.length ? Math.floor(Math.min(...allWeights) - 2) : 50;
  const yMax = allWeights.length ? Math.ceil(Math.max(...allWeights) + 2) : 100;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">{zh ? '体重' : 'Body Weight'}</p>
        <h1 className="mt-3 text-4xl font-bold">{zh ? '体重追踪' : 'Weight Tracker'}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          {zh ? '记录每日体重、可视化趋势，并追踪你的目标进度。' : 'Log your daily weight, visualize your trend, and track progress toward your goal.'}
        </p>
        {latestWeight !== null && (
          <div className="mt-6 flex gap-6 flex-wrap">
            <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
              <div className="text-sm text-slate-300">{zh ? '最新' : 'Latest'}</div>
              <div className="mt-1 text-3xl font-semibold">{latestWeight.toFixed(1)} kg</div>
            </div>
            {totalChange !== null && (
              <div className="rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
                <div className="text-sm text-slate-300">{zh ? `变化（${logs.length}条）` : `Change (${logs.length} entries)`}</div>
                <div className={`mt-1 text-3xl font-semibold ${totalChange < 0 ? 'text-green-300' : totalChange > 0 ? 'text-red-300' : 'text-white'}`}>
                  {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">{zh ? '记录体重' : 'Log weight'}</h2>
        <form onSubmit={handleLog} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '日期' : 'Date'}</label>
            <input
              type="date"
              value={inputDate}
              max={todayInputDate()}
              onChange={(e) => setInputDate(e.target.value)}
              className="w-44 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '体重 (kg)' : 'Weight (kg)'}</label>
            <input
              type="number"
              step="0.1"
              min="20"
              max="500"
              value={inputKg}
              onChange={(e) => setInputKg(e.target.value)}
              placeholder={zh ? '例如 72.5' : 'e.g. 72.5'}
              className="w-36 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '备注（可选）' : 'Note (optional)'}</label>
            <input
              type="text"
              value={inputNote}
              onChange={(e) => setInputNote(e.target.value)}
              placeholder={zh ? '例如：早餐前晨起称重' : 'e.g. morning before breakfast'}
              className="w-64 rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              maxLength={200}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-sky-600 px-6 py-2 text-white font-medium hover:bg-sky-500 disabled:opacity-50 transition"
          >
            {submitting ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存体重' : 'Log weight')}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {chartData.length > 1 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">{zh ? '体重趋势' : 'Weight trend'}</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
              <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12 }} tickLine={false} unit=" kg" width={60} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)} kg`, zh ? '体重' : 'Weight']}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
              />
              {startWeight !== null && (
                <ReferenceLine y={startWeight} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: zh ? '起点' : 'Start', position: 'right', fontSize: 11 }} />
              )}
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#0ea5e9"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0ea5e9', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {chartData.length === 1 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {zh ? '至少记录 2 条体重数据才能显示趋势图。' : 'Log at least 2 entries to see your trend chart.'}
        </div>
      )}

      {logs.length > 0 && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">{zh ? '历史记录' : 'History'}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-2 text-slate-500 font-medium">{zh ? '日期' : 'Date'}</th>
                  <th className="pb-2 text-slate-500 font-medium">{zh ? '体重' : 'Weight'}</th>
                  <th className="pb-2 text-slate-500 font-medium">{zh ? '备注' : 'Note'}</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().slice(0, 30).map((log) => (
                  <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-700">{formatDate(log.loggedAt, locale)}</td>
                    <td className="py-2 pr-4 font-semibold text-slate-900">{log.weightKg.toFixed(1)} kg</td>
                    <td className="py-2 pr-4 text-slate-500">{log.note ?? '—'}</td>
                    <td className="py-2">
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="text-xs text-red-400 hover:text-red-600 transition"
                      >
                        {zh ? '删除' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading && (
        <div className="text-center text-slate-400 py-12">{zh ? '正在加载体重历史…' : 'Loading weight history…'}</div>
      )}

      {!loading && logs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          {zh ? '还没有体重记录。请先在上方录入第一条。' : 'No weight entries yet. Log your first weight above.'}
        </div>
      )}
    </div>
  );
};
