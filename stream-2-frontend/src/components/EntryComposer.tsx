import React from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../context/LanguageContext';

interface EntryComposerProps {
  onSubmit: (type: 'workout' | 'meal', raw_text: string, occurred_at: string) => void;
  isLoading?: boolean;
}

export const EntryComposer: React.FC<EntryComposerProps> = ({ onSubmit, isLoading = false }) => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      type: 'workout' as 'workout' | 'meal',
      raw_text: '',
      occurred_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    },
  });

  const selectedType = watch('type');

  const submit = handleSubmit((values) => {
    onSubmit(values.type, values.raw_text, new Date(values.occurred_at).toISOString());
    reset({
      type: values.type,
      raw_text: '',
      occurred_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
    });
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <div className="text-sm font-medium text-slate-700">{zh ? '类型' : 'Type'}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setValue('type', 'workout')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === 'workout' ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
          >
            <div className="text-sm font-semibold uppercase tracking-wide">{zh ? '训练' : 'Workout'}</div>
            <div className="mt-1 text-sm">{zh ? '跑步、力量训练、课程、恢复训练或任何与训练相关的活动。' : 'Runs, lifts, classes, recovery sessions, or anything training-related.'}</div>
          </button>
          <button
            type="button"
            onClick={() => setValue('type', 'meal')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${selectedType === 'meal' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
          >
            <div className="text-sm font-semibold uppercase tracking-wide">{zh ? '饮食' : 'Meal'}</div>
            <div className="mt-1 text-sm">{zh ? '早餐、午餐、晚餐、加餐、训练后补给，或漏餐情况。' : 'Breakfast, lunch, dinner, snack, post-workout fuel, or skipped-meal context.'}</div>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">{zh ? '活动描述' : 'Activity description'}</label>
        <textarea
          {...register('raw_text', { required: true })}
          rows={4}
          placeholder={selectedType === 'workout'
            ? (zh ? '晨跑：6点，8公里，轻松配速' : 'Morning run: 6am, 5 miles, easy pace')
            : (zh ? '早餐：燕麦 + 蓝莓 + 杏仁' : 'Breakfast: oatmeal with berries and almonds')}
          className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">{zh ? '发生时间' : 'When did this occur?'}</label>
        <input
          type="datetime-local"
          {...register('occurred_at', { required: true })}
          className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading ? (zh ? '正在保存记录...' : 'Saving entry...') : (zh ? '继续填写感受' : 'Continue to feelings')}
      </button>
    </form>
  );
};