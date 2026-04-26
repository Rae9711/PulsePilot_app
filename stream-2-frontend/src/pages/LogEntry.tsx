import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { EntryComposer } from '../components/EntryComposer';
import { FeelingCapture } from '../components/FeelingCapture';
import { useAppContext } from '../context/AppProvider';
import { useLanguage } from '../context/LanguageContext';
import { Entry } from '../types/index';

type Stage = 'entry' | 'pre' | 'post' | 'complete';

export const LogEntry: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const navigate = useNavigate();
  const { addEntry, setLoading, setError } = useAppContext();
  const [stage, setStage] = useState<Stage>('entry');
  const [currentEntry, setCurrentEntry] = useState<Entry | null>(null);
  const [message, setMessage] = useState('');

  const handleEntrySubmit = async (
    type: 'workout' | 'meal',
    raw_text: string,
    occurred_at: string
  ) => {
    try {
      setLoading(true);
      const entry = await apiClient.createEntry(type, raw_text, occurred_at);
      setCurrentEntry(entry);
      setStage('pre');
      setMessage(
        entry.coachAdvice
          ? `${zh ? '记录已创建。' : 'Entry created. '} ${entry.coachAdvice}`
          : (zh ? '记录已创建。请先填写活动前感受。' : 'Entry created. Capture how you felt before the activity.'),
      );
    } catch (error) {
      setError(zh ? '创建记录失败' : 'Failed to create entry');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeelingSubmit = async (payload: {
    when: 'pre' | 'post';
    valence: number;
    energy: number;
    stress: number;
    notes?: string;
  }) => {
    if (!currentEntry) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.addFeeling(
        currentEntry.id,
        payload.when,
        payload.valence,
        payload.energy,
        payload.stress,
        payload.notes
      );

      if (payload.when === 'pre') {
        setStage('post');
        setMessage(zh ? '已保存活动前感受。请填写活动后感受。' : 'Pre-entry feeling saved. Capture how you felt after the activity.');
      } else {
        addEntry(currentEntry);
        setStage('complete');
        setMessage(zh ? '记录已保存。你的基线与洞察会自动更新。' : 'Entry logged successfully. Your baselines and insights will update automatically.');
      }
    } catch (error) {
      setError(zh ? '保存感受失败' : 'Failed to record feeling');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const completeWithoutStage = () => {
    if (!currentEntry) {
      return;
    }
    addEntry(currentEntry);
    setStage('complete');
    setMessage(zh ? '记录已保存。下次补全前后感受可获得更强洞察。' : 'Entry logged successfully. Add complete feelings next time for stronger insights.');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{zh ? '记录一条日志' : 'Log an entry'}</h1>
        <p className="mt-2 text-slate-500">{zh ? '先记录活动，再填写前后感受，洞察引擎才能解释你的模式。' : 'Capture the entry first, then record how you felt before and after so the insight engine can explain the pattern.'}</p>
      </div>

      {message && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {message}
        </div>
      )}

      {stage === 'entry' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <EntryComposer onSubmit={handleEntrySubmit} />
        </section>
      )}

      {stage === 'pre' && currentEntry && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">{zh ? '当前记录' : 'Current entry'}</div>
            <div className="mt-1">{currentEntry.raw_text}</div>
          </div>
          <FeelingCapture when="pre" onSubmit={handleFeelingSubmit} />
          <button type="button" onClick={() => setStage('post')} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {zh ? '跳过前感受，继续' : 'Skip pre-feeling and continue'}
          </button>
        </section>
      )}

      {stage === 'post' && currentEntry && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-semibold text-slate-900">{zh ? '当前记录' : 'Current entry'}</div>
            <div className="mt-1">{currentEntry.raw_text}</div>
          </div>
          <FeelingCapture when="post" onSubmit={handleFeelingSubmit} />
          <button type="button" onClick={completeWithoutStage} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            {zh ? '跳过后感受并完成' : 'Skip post-feeling and finish'}
          </button>
        </section>
      )}

      {stage === 'complete' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-5xl">✓</div>
          <h2 className="mt-4 text-2xl font-semibold text-slate-900">{zh ? '记录完成' : 'Entry logged'}</h2>
          <p className="mt-2 text-slate-500">{zh ? '后台重算完成后，仪表盘与趋势页会更新这条记录。' : 'Your dashboard and trend views will reflect the new entry as soon as the backend recompute finishes.'}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button onClick={() => navigate('/')} className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500">
              {zh ? '返回仪表盘' : 'Return to dashboard'}
            </button>
            <button
              onClick={() => {
                setCurrentEntry(null);
                setMessage('');
                setStage('entry');
              }}
              className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {zh ? '再记一条' : 'Log another entry'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
};