import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAppContext } from '../context/AppProvider';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { ChatMessage, DailySummary, FitnessPlan, PersonalizationSummary } from '../types/index';

const todayStr = () => new Date().toISOString().split('T')[0];

const formatTime = (value?: string) => {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatExerciseItem = (item: unknown): string => {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return String(item ?? '');

  const value = item as Record<string, unknown>;
  const name = typeof value.name === 'string' ? value.name : null;
  const type = typeof value.type === 'string' ? value.type : null;
  const duration = typeof value.duration === 'string' ? value.duration : null;
  const frequency = typeof value.frequency === 'string' ? value.frequency : null;

  const parts = [name, type, duration, frequency].filter((part): part is string => Boolean(part));
  if (parts.length > 0) return parts.join(' - ');

  try {
    return JSON.stringify(item);
  } catch {
    return 'Exercise recommendation';
  }
};

// ── Inline AI Coach Chat ─────────────────────────────────────────────────────

const DashboardChat: React.FC<{ plan: FitnessPlan | null }> = ({ plan }) => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const history = await apiClient.getChatHistory();
        setMessages(history);
      } catch { /* ignore */ }
      finally { setLoadingHistory(false); }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const tmpId = `tmp-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: tmpId, userId: '', role: 'user',
      content: text.trim(), createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { reply, messageId } = await apiClient.sendChatMessage(text.trim());
      const realUserId = `u-${messageId}`;
      const assistantMsg: ChatMessage = {
        id: messageId, userId: '', role: 'assistant',
        content: reply, createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tmpId),
        { ...userMsg, id: realUserId },
        assistantMsg,
      ]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`, userId: '', role: 'assistant',
        content: zh ? '抱歉，暂时无法连接 AI。' : 'Sorry, I couldn\'t reach the AI right now.',
        createdAt: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const greeting = plan
    ? (zh
      ? `你好！你的每日目标是 ${Math.round(plan.dailyCalories)} kcal · 蛋白 ${Math.round(plan.dailyProteinG)}g · 碳水 ${Math.round(plan.dailyCarbsG)}g。你可以问我关于当天、训练或饮食的任何问题。`
      : `Hi! Your daily target is ${Math.round(plan.dailyCalories)} kcal · ${Math.round(plan.dailyProteinG)}g protein · ${Math.round(plan.dailyCarbsG)}g carbs. Ask me anything about your day, training, or meals.`)
    : (zh ? '你好！我是你的 AI 健身教练。可以问我营养、训练或进度相关问题。' : 'Hi! I\'m your AI fitness coach. Ask me anything about nutrition, workouts, or progress.');

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden relative" style={{ height: '520px' }}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white">
        <div className="h-8 w-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-bold shrink-0">AI</div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">{zh ? 'AI 教练' : 'AI Coach'}</div>
          <div className="text-xs text-slate-400">{zh ? '纯聊天辅导 · 上下文按天重置' : 'Chat-only coaching · Context resets daily'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loadingHistory ? (
          <div className="text-center text-slate-400 text-sm mt-8">{zh ? '加载中…' : 'Loading…'}</div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800 max-w-[85%]">
                {greeting}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-4 py-2.5 text-sm max-w-[82%] whitespace-pre-wrap leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-400 rounded-bl-sm">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={zh ? '向教练提问…' : 'Ask your coach anything…'}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="rounded-xl bg-sky-600 px-4 py-2 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-40 transition"
        >
          {zh ? '发送' : 'Send'}
        </button>
      </form>
    </div>
  );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────

export const Dashboard: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userId, entries, setEntries, setLoading, setError } = useAppContext();
  const [plan, setPlan] = useState<FitnessPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [personalization, setPersonalization] = useState<PersonalizationSummary | null>(null);

  const confidenceTone = {
    low: 'bg-rose-50 text-rose-700 border-rose-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  } as const;

  const riskTone = {
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50 text-amber-700 border-amber-200',
    high: 'bg-rose-50 text-rose-700 border-rose-200',
  } as const;

  const loadPlanAndSummary = useCallback(async () => {
    try {
      const [p, s, fetched, personalized] = await Promise.all([
        apiClient.getPlan().catch(() => null),
        apiClient.getDailySummary().catch(() => null),
        apiClient.getEntries(userId, 30).catch(() => null),
        apiClient.getPersonalizationSummary().catch(() => null),
      ]);
      setPlan(p);
      setDailySummary(s);
      setPersonalization(personalized);
      if (fetched) setEntries(fetched);
    } finally {
      setPlanLoading(false);
    }
  }, [userId, setEntries]);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        setLoading(true);
        const fetched = await apiClient.getEntries(userId, 30);
        setEntries(fetched);
      } catch (error) {
        setError(zh ? '加载记录失败' : 'Failed to load entries');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      loadEntries();
      loadPlanAndSummary();
    }
  }, [userId, setEntries, setLoading, setError, loadPlanAndSummary, zh]);

  const todayEntries = useMemo(() => {
    const today = todayStr();
    return entries.filter((e) => e.occurred_at.startsWith(today));
  }, [entries]);

  const macros = [
    { label: zh ? '热量' : 'Calories', unit: 'kcal', target: plan?.dailyCalories, consumed: dailySummary?.totals.caloriesKcal, color: 'sky' },
    { label: zh ? '蛋白质' : 'Protein', unit: 'g', target: plan?.dailyProteinG, consumed: dailySummary?.totals.proteinG, color: 'emerald' },
    { label: zh ? '碳水' : 'Carbs', unit: 'g', target: plan?.dailyCarbsG, consumed: dailySummary?.totals.carbsG, color: 'amber' },
    { label: zh ? '脂肪' : 'Fat', unit: 'g', target: plan?.dailyFatG, consumed: dailySummary?.totals.fatG, color: 'rose' },
  ] as const;

  const colorMap = {
    sky: { bar: 'bg-sky-500', text: 'text-sky-700', bg: 'bg-sky-50', border: 'border-sky-100', ring: 'ring-sky-200' },
    emerald: { bar: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', ring: 'ring-emerald-200' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', ring: 'ring-amber-200' },
    rose: { bar: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100', ring: 'ring-rose-200' },
  };

  return (
    <div className="space-y-6">
      {/* ── Hero greeting ──────────────────────────────────────── */}
      <section className="rounded-3xl bg-slate-900 px-8 py-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{zh ? '今天' : 'Today'} · {new Date().toLocaleDateString(zh ? 'zh-CN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1 className="mt-2 text-3xl font-bold">{zh ? '你好' : 'Hey'} {user?.name?.split(' ')[0] || (zh ? '你' : 'there')} 👋</h1>
            <p className="mt-1 text-slate-400 text-sm">{zh ? '可在下方与 AI 教练对话，或记录你的饮食和训练。' : 'Chat with your AI coach below or log what you ate and your workouts.'}</p>
          </div>
          <button
            onClick={() => navigate('/log')}
            className="hidden sm:flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 px-5 py-3 text-sm font-medium transition"
          >
            {zh ? '+ 记录' : '+ Log entry'}
          </button>
        </div>
      </section>

      {personalization && (
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${confidenceTone[personalization.outcomeFocus.confidenceLabel]}`}>
                {zh ? `${personalization.outcomeFocus.confidenceLabel} 置信` : `${personalization.outcomeFocus.confidenceLabel} confidence`}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${riskTone[personalization.riskLevel]}`}>
                {zh ? `${personalization.riskLevel} 风险` : `${personalization.riskLevel} risk`}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold uppercase text-slate-600">
                {zh ? `模式: ${personalization.coachingMode}` : `mode: ${personalization.coachingMode}`}
              </span>
            </div>
            <h2 className="mt-3 text-xl font-semibold text-slate-900">{zh ? '最佳下一步动作' : 'Best Next Action'}</h2>
            <p className="mt-2 text-sm font-medium text-slate-800">{personalization.outcomeFocus.bestNextAction}</p>
            <p className="mt-2 text-sm text-slate-600">{zh ? '预期收益' : 'Expected benefit'}: {personalization.outcomeFocus.expectedBenefit}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {personalization.outcomeFocus.evidence.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">{item.value}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{zh ? '每周回顾' : 'Weekly Recap'}</h3>
            <div className="mt-3 space-y-2">
              {personalization.weeklyRecap.wins.slice(0, 2).map((item) => (
                <div key={item} className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{item}</div>
              ))}
              {personalization.weeklyRecap.misses.slice(0, 2).map((item) => (
                <div key={item} className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-800">{item}</div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-600">{zh ? '下一关注点' : 'Next focus'}: {personalization.weeklyRecap.nextFocus}</p>
          </article>
        </section>
      )}

      {/* ── Goal & AI Plan ────────────────────────────────────── */}
      {planLoading ? null : plan ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium">{zh ? '你的目标与 AI 计划' : 'Your Goal & AI Plan'}</div>
              <p className="mt-1.5 text-slate-700 text-sm max-w-2xl leading-relaxed">{plan.goalSummary}</p>
            </div>
            <button
              onClick={() => navigate('/coach')}
              className="text-xs text-slate-400 hover:text-slate-600 transition shrink-0 ml-4"
            >
              {zh ? '更新计划' : 'Update plan'}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {macros.map(({ label, unit, target, consumed, color }) => {
              const c = colorMap[color];
              const pct = consumed != null && target ? Math.min(100, Math.round((consumed / target) * 100)) : null;
              const over = pct != null && pct >= 100;
              return (
                <div key={label} className={`rounded-2xl border p-4 ${c.bg} ${c.border}`}>
                  <div className="text-xs text-slate-500 font-medium">{label}</div>
                  <div className={`text-2xl font-bold mt-1 ${c.text}`}>
                    {target ? `${Math.round(target)}${unit}` : '—'}
                  </div>
                  {consumed != null && target ? (
                    <>
                      <div className="text-xs text-slate-400 mt-1">
                        {typeof consumed === 'number' ? Math.round(consumed) : consumed}{unit} {zh ? '已摄入' : 'eaten'} · {pct}%
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/70 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${over ? 'bg-red-400' : c.bar}`}
                          style={{ width: `${pct ?? 0}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-slate-400 mt-1">{zh ? '暂无记录' : 'Nothing logged yet'}</div>
                  )}
                </div>
              );
            })}
          </div>
          {plan.exercisePlan && plan.exercisePlan.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-2">{zh ? '训练计划' : 'Exercise Plan'}</div>
              <div className="flex flex-wrap gap-2">
                {plan.exercisePlan.map((item, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{formatExerciseItem(item)}</span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-3 text-xs text-slate-400">
            BMR {Math.round(plan.bmr)} kcal · TDEE {Math.round(plan.tdee)} kcal · {plan.calorieDeficit > 0 ? (zh ? '缺口' : 'Deficit') : (zh ? '盈余' : 'Surplus')} {Math.abs(Math.round(plan.calorieDeficit))} kcal/{zh ? '天' : 'day'}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50 p-8 text-center shadow-sm">
          <div className="text-2xl mb-2">🎯</div>
          <h2 className="text-lg font-semibold text-slate-800">{zh ? '设置你的 AI 健身计划' : 'Set up your AI fitness plan'}</h2>
          <p className="text-sm text-slate-500 mt-1 mb-4">{zh ? '输入年龄、体重和目标。AI 会计算 BMR、每日热量、宏量营养并给出训练计划。' : 'Enter your age, weight, and goal. The AI will calculate your BMR, daily calories, macros, and a workout plan.'}</p>
          <button
            onClick={() => navigate('/coach')}
            className="rounded-xl bg-sky-600 px-6 py-2.5 text-white text-sm font-semibold hover:bg-sky-500 transition"
          >
            {zh ? '生成个性化计划 →' : 'Get my personalized plan →'}
          </button>
        </section>
      )}

      {/* ── AI Coach + Today's Entries ────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* AI Chat */}
        <DashboardChat plan={plan} />

        {/* Today's entries */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col overflow-hidden" style={{ minHeight: '520px' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <div className="font-semibold text-slate-900 text-sm">{zh ? '今日记录' : `Today's Entries`}</div>
              <div className="text-xs text-slate-400 mt-0.5">{zh ? `今日已记录 ${todayEntries.length} 条` : `${todayEntries.length} logged today`}</div>
            </div>
            <button onClick={() => navigate('/log')} className="text-xs text-sky-600 hover:text-sky-500 font-medium transition">
              {zh ? '+ 添加' : '+ Add'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {todayEntries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="text-3xl mb-3">🍽️</div>
                <p className="text-slate-500 text-sm font-medium">{zh ? '今天还没有记录' : 'Nothing logged today yet'}</p>
                <p className="text-slate-400 text-xs mt-1">{zh ? '告诉 AI 教练你吃了什么或做了什么，或点击 + 添加' : 'Tell the AI coach what you ate or did, or tap + Add'}</p>
              </div>
            ) : (
              todayEntries.map((entry) => {
                const post = entry.feelings?.find((f) => f.when === 'post');
                return (
                  <article key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          entry.type === 'meal' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {entry.type === 'meal' ? (zh ? '🍴 饮食' : '🍴 Meal') : (zh ? '💪 训练' : '💪 Workout')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{formatTime(entry.occurred_at)}</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-800 font-medium">{entry.raw_text}</div>
                    {post && (
                      <div className="mt-2 flex gap-3 text-xs text-slate-400">
                        <span>{zh ? '心情' : 'Mood'} {post.valence}/10</span>
                        <span>{zh ? '精力' : 'Energy'} {post.energy}/10</span>
                        <span>{zh ? '压力' : 'Stress'} {post.stress}/10</span>
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>

          {entries.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
              <button onClick={() => navigate('/history')} className="text-xs text-slate-400 hover:text-slate-600 transition w-full text-center">
                {zh ? '查看完整历史 →' : 'View full history →'}
              </button>
            </div>
          )}
        </div>
      </section>

      {personalization && (
        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{zh ? '推荐原因说明' : 'Why These Recommendations'}</h3>
              <span className="text-xs text-slate-400">{zh ? '可解释性' : 'Explainability'}</span>
            </div>
            <div className="mt-4 space-y-3">
              {personalization.recommendations
                .filter((r) => r.confidence >= 0.45)
                .map((rec) => (
                  <details key={rec.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3" open>
                    <summary className="cursor-pointer list-none">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
                          <div className="mt-1 text-xs text-slate-600">{rec.action}</div>
                        </div>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${confidenceTone[rec.confidenceLabel]}`}>
                          {rec.confidenceLabel}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 text-xs text-slate-700">{rec.expectedBenefit}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {rec.evidence.map((item) => (
                        <div key={item.label} className="rounded-xl bg-white px-2 py-1.5">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</div>
                          <div className="text-xs font-semibold text-slate-900">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Experiment Scorecard</h3>
            <p className="mt-1 text-sm text-slate-500">{zh ? '过去一周动作到结果的闭环表现。' : 'Action-to-outcome loop over the last week.'}</p>
            <div className="mt-4 space-y-3">
              {personalization.weeklyExperiments.map((exp) => (
                <div key={exp.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">{exp.title}</div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      exp.status === 'winning'
                        ? 'bg-emerald-100 text-emerald-700'
                        : exp.status === 'needs_attention'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200 text-slate-700'
                    }`}>
                      {exp.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white px-2 py-1.5 text-slate-700">{zh ? '执行率' : 'Adherence'}: <span className="font-semibold">{exp.adherencePct}%</span></div>
                    <div className="rounded-xl bg-white px-2 py-1.5 text-slate-700">{zh ? '结果分数' : 'Outcome score'}: <span className="font-semibold">{exp.outcomeScore.toFixed(2)}</span></div>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{exp.summary}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2">
              <div className="text-xs font-semibold text-sky-800">{zh ? '体重-表现关联' : 'Weight-Performance Link'}</div>
              <div className="mt-1 text-xs text-sky-900">{personalization.weightPerformanceLink.summary}</div>
              <div className="mt-2 text-[11px] text-sky-800">
                {zh ? '相关系数' : 'correlation'}: {personalization.weightPerformanceLink.correlation == null ? 'n/a' : personalization.weightPerformanceLink.correlation.toFixed(3)} · {zh ? '置信度' : 'confidence'}: {personalization.weightPerformanceLink.confidenceLabel}
              </div>
            </div>
          </article>
        </section>
      )}
    </div>
  );
};
