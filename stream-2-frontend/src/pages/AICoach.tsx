import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import {
  ChatMessage,
  FitnessPlan,
  ActivityLevel,
  Gender,
  GoalType,
} from '../types/index';
import { useLanguage } from '../context/LanguageContext';

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

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  light: 'Lightly active (1–3 days/week)',
  moderate: 'Moderately active (3–5 days/week)',
  active: 'Very active (6–7 days/week)',
  very_active: 'Extra active (physical job or 2×/day)',
};

const ACTIVITY_LABELS_ZH: Record<ActivityLevel, string> = {
  sedentary: '久坐（少运动）',
  light: '轻度活跃（每周 1-3 天）',
  moderate: '中度活跃（每周 3-5 天）',
  active: '高度活跃（每周 6-7 天）',
  very_active: '非常活跃（体力工作或每日两练）',
};

// ── Onboarding / Plan setup form ─────────────────────────────────────────────

interface PlanFormState {
  birthYear: string;
  gender: Gender | '';
  heightCm: string;
  currentWeightKg: string;
  activityLevel: ActivityLevel | '';
  goalType: GoalType | '';
  goalWeightKg: string;
  goalDays: string;
}

const PlanSetup: React.FC<{ onPlanGenerated: (plan: FitnessPlan) => void; zh: boolean }> = ({ onPlanGenerated, zh }) => {
  const [form, setForm] = useState<PlanFormState>({
    birthYear: '',
    gender: '',
    heightCm: '',
    currentWeightKg: '',
    activityLevel: '',
    goalType: '',
    goalWeightKg: '',
    goalDays: '30',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof PlanFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.gender || !form.activityLevel || !form.goalType) {
      setError(zh ? '请完整填写所有字段。' : 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const plan = await apiClient.generatePlan({
        birthYear: parseInt(form.birthYear),
        gender: form.gender,
        heightCm: parseFloat(form.heightCm),
        currentWeightKg: parseFloat(form.currentWeightKg),
        activityLevel: form.activityLevel,
        goalType: form.goalType,
        goalWeightKg: parseFloat(form.goalWeightKg),
        goalDays: parseInt(form.goalDays),
      });
      onPlanGenerated(plan);
    } catch {
      setError(zh ? '生成计划失败，请检查输入后重试。' : 'Failed to generate plan. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900 mb-2">{zh ? '设置健身计划' : 'Set up your fitness plan'}</h2>
      <p className="text-slate-500 mb-6 text-sm">
        {zh ? '输入你的数据与目标。AI 会计算 BMR、TDEE，并生成个性化每日热量和训练计划。' : 'Enter your stats and goal. The AI will calculate your BMR, TDEE, and create a personalized daily calorie + workout plan.'}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '出生年份' : 'Birth year'}</label>
            <input
              type="number"
              min="1924"
              max="2010"
              required
              value={form.birthYear}
              onChange={set('birthYear')}
              placeholder={zh ? '例如 1995' : 'e.g. 1995'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '性别' : 'Gender'}</label>
            <select
              required
              value={form.gender}
              onChange={set('gender')}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            >
              <option value="">{zh ? '请选择…' : 'Select…'}</option>
              <option value="male">{zh ? '男' : 'Male'}</option>
              <option value="female">{zh ? '女' : 'Female'}</option>
              <option value="other">{zh ? '其他' : 'Other'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '身高 (cm)' : 'Height (cm)'}</label>
            <input
              type="number"
              min="100"
              max="250"
              step="0.5"
              required
              value={form.heightCm}
              onChange={set('heightCm')}
              placeholder={zh ? '例如 170' : 'e.g. 170'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '当前体重 (kg)' : 'Current weight (kg)'}</label>
            <input
              type="number"
              min="30"
              max="400"
              step="0.1"
              required
              value={form.currentWeightKg}
              onChange={set('currentWeightKg')}
              placeholder={zh ? '例如 75' : 'e.g. 75'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '目标体重 (kg)' : 'Goal weight (kg)'}</label>
            <input
              type="number"
              min="30"
              max="400"
              step="0.1"
              required
              value={form.goalWeightKg}
              onChange={set('goalWeightKg')}
              placeholder={zh ? '例如 65' : 'e.g. 65'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '目标周期（天）' : 'Goal timeline (days)'}</label>
            <input
              type="number"
              min="7"
              max="730"
              required
              value={form.goalDays}
              onChange={set('goalDays')}
              placeholder={zh ? '例如 30' : 'e.g. 30'}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '目标类型' : 'Goal type'}</label>
          <select
            required
            value={form.goalType}
            onChange={set('goalType')}
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            <option value="">{zh ? '请选择…' : 'Select…'}</option>
            <option value="lose">{zh ? '减重' : 'Lose weight'}</option>
            <option value="gain">{zh ? '增重 / 增肌' : 'Gain weight / muscle'}</option>
            <option value="maintain">{zh ? '维持体重' : 'Maintain weight'}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">{zh ? '活动水平' : 'Activity level'}</label>
          <select
            required
            value={form.activityLevel}
            onChange={set('activityLevel')}
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
          >
            <option value="">{zh ? '请选择…' : 'Select…'}</option>
            {(Object.entries(zh ? ACTIVITY_LABELS_ZH : ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-sky-600 py-3 text-white font-semibold hover:bg-sky-500 disabled:opacity-50 transition"
        >
          {loading ? (zh ? 'AI 正在生成计划…' : 'Generating your plan with AI…') : (zh ? '生成我的计划' : 'Generate my plan')}
        </button>
      </form>
    </div>
  );
};

// ── Plan display ─────────────────────────────────────────────────────────────

const PlanCard: React.FC<{ plan: FitnessPlan; onReset: () => void; zh: boolean }> = ({ plan, onReset, zh }) => (
  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold text-emerald-900">{zh ? 'AI 生成计划' : 'Your AI-generated plan'}</h3>
        <p className="mt-1 text-sm text-emerald-700 max-w-2xl">{plan.goalSummary}</p>
      </div>
      <button onClick={onReset} className="text-xs text-slate-400 hover:text-slate-600 transition ml-4 shrink-0">
        {zh ? '重新生成' : 'Regenerate'}
      </button>
    </div>
    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: zh ? '每日热量' : 'Daily calories', value: `${Math.round(plan.dailyCalories)} kcal` },
        { label: zh ? '蛋白质' : 'Protein', value: `${Math.round(plan.dailyProteinG)}g` },
        { label: zh ? '碳水' : 'Carbs', value: `${Math.round(plan.dailyCarbsG)}g` },
        { label: zh ? '脂肪' : 'Fat', value: `${Math.round(plan.dailyFatG)}g` },
      ].map(({ label, value }) => (
        <div key={label} className="rounded-2xl bg-white border border-emerald-100 p-3 text-center">
          <div className="text-xs text-slateald-500 text-slate-500">{label}</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{value}</div>
        </div>
      ))}
    </div>
    <div className="mt-4">
      <div className="text-xs text-slate-500">BMR: {Math.round(plan.bmr)} kcal · TDEE: {Math.round(plan.tdee)} kcal · {plan.calorieDeficit > 0 ? (zh ? '缺口' : 'Deficit') : (zh ? '盈余' : 'Surplus')}: {Math.abs(Math.round(plan.calorieDeficit))} kcal/{zh ? '天' : 'day'}</div>
    </div>
    {plan.exercisePlan && plan.exercisePlan.length > 0 && (
      <div className="mt-4">
        <h4 className="text-sm font-semibold text-emerald-900 mb-2">{zh ? '训练建议' : 'Exercise recommendations'}</h4>
        <ul className="space-y-1">
          {plan.exercisePlan.map((item, i) => (
            <li key={i} className="text-sm text-emerald-800 flex gap-2">
              <span className="text-emerald-400">•</span>{formatExerciseItem(item)}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

// ── Chat interface ───────────────────────────────────────────────────────────

const ChatInterface: React.FC<{ plan: FitnessPlan | null; zh: boolean }> = ({ plan, zh }) => {
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
      } catch {
        // ignore
      } finally {
        setLoadingHistory(false);
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      userId: '',
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    try {
      const { reply, messageId } = await apiClient.sendChatMessage(text.trim());
      const assistantMsg: ChatMessage = {
        id: messageId,
        userId: '',
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => {
        // Replace temp user message with actual from server (keep order)
        return [...prev.filter((m) => m.id !== userMsg.id), { ...userMsg, id: `u-${messageId}` }, assistantMsg];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          userId: '',
          role: 'assistant',
          content: zh ? '抱歉，暂时无法连接 AI，请稍后重试。' : 'Sorry, I could not reach the AI right now. Make sure the backend has INSIGHTS_LLM_PROVIDER and OPENAI_API_KEY set.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const clearChat = async () => {
    await apiClient.clearChatHistory();
    setMessages([]);
  };

  const greeting = plan
    ? (zh
      ? `你好！我是你的 AI 教练。你的每日目标是 ${Math.round(plan.dailyCalories)} kcal（蛋白 ${Math.round(plan.dailyProteinG)}g，碳水 ${Math.round(plan.dailyCarbsG)}g）。你可以问我任何营养、训练或进度问题！`
      : `Hi! I'm your AI coach. Your daily target is ${Math.round(plan.dailyCalories)} kcal (${Math.round(plan.dailyProteinG)}g protein, ${Math.round(plan.dailyCarbsG)}g carbs). Ask me anything about your nutrition, workouts, or progress!`)
    : (zh ? '你好！我是你的 AI 健身教练。请先设置计划，然后我会给你个性化指导。也可以直接问我健身和营养问题！' : 'Hi! I\'m your AI fitness coach. Set up your plan first, then I can give you personalized guidance. Or ask me anything about fitness and nutrition!');

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col" style={{ height: '600px' }}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">{zh ? 'AI 教练对话' : 'AI Coach Chat'}</h2>
        {messages.length > 0 && (
          <button onClick={clearChat} className="text-xs text-slate-400 hover:text-slate-600 transition">
            {zh ? '清空历史' : 'Clear history'}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {loadingHistory ? (
          <div className="text-center text-slate-400 text-sm mt-8">{zh ? '正在加载历史…' : 'Loading history…'}</div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="rounded-2xl bg-sky-50 border border-sky-100 px-4 py-3 text-sm text-sky-800 max-w-[80%]">
                {greeting}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[78%] whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500 rounded-bl-sm">
                  {zh ? '思考中…' : 'Thinking…'}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Chat input */}
      <div className="px-6 pb-4 pt-2 border-t border-slate-100">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={zh ? '向 AI 教练提问…' : 'Ask your AI coach anything…'}
            disabled={sending}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-xl bg-sky-600 px-5 py-2 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50 transition"
          >
            {zh ? '发送' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

export const AICoach: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const [plan, setPlan] = useState<FitnessPlan | null | undefined>(undefined); // undefined = loading
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    apiClient.getPlan().then((p) => {
      setPlan(p);
      if (!p) setShowSetup(true);
    });
  }, []);

  const handlePlanGenerated = (newPlan: FitnessPlan) => {
    setPlan(newPlan);
    setShowSetup(false);
  };

  if (plan === undefined) {
    return (
      <div className="text-center text-slate-400 py-24">{zh ? '正在加载你的计划…' : 'Loading your plan…'}</div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-slate-900 px-8 py-10 text-white shadow-xl">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-300">AI Coach</p>
        <h1 className="mt-3 text-4xl font-bold">{zh ? '你的专属 AI 健身教练' : 'Your Personal Fitness AI'}</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          {zh ? '与 AI 教练对话，调整计划、优化训练与营养决策，并持续朝目标前进。' : 'Chat with your AI coach to adjust your plan, improve training and nutrition decisions, and stay on track toward your goal.'}
        </p>
      </section>

      {showSetup || !plan ? (
        <PlanSetup onPlanGenerated={handlePlanGenerated} zh={zh} />
      ) : (
        <>
          <PlanCard plan={plan} onReset={() => setShowSetup(true)} zh={zh} />
          <ChatInterface plan={plan} zh={zh} />
        </>
      )}
    </div>
  );
};
