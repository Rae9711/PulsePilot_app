import React from 'react';
import { useForm } from 'react-hook-form';
import { useLanguage } from '../context/LanguageContext';

interface FeelingCaptureProps {
  onSubmit: (feelings: {
    when: 'pre' | 'post';
    valence: number;
    energy: number;
    stress: number;
    notes?: string;
  }) => void;
  when: 'pre' | 'post';
  isLoading?: boolean;
}

const moodLabels = {
  en: ['Low', 'Low', 'Steady', 'Good', 'Excellent'],
  zh: ['较低', '偏低', '平稳', '良好', '很好'],
} as const;
const energyLabels = {
  en: ['Drained', 'Low', 'Stable', 'Ready', 'Charged'],
  zh: ['疲惫', '偏低', '稳定', '充足', '满电'],
} as const;
const stressLabels = {
  en: ['Calm', 'Light', 'Managed', 'High', 'Very high'],
  zh: ['平静', '轻微', '可控', '偏高', '很高'],
} as const;

type FormValues = {
  valence: string;
  energy: string;
  stress: string;
  notes: string;
};

const ScaleField = ({
  label,
  iconStart,
  iconEnd,
  value,
  descriptor,
  register,
  name,
}: {
  label: string;
  iconStart: string;
  iconEnd: string;
  value: string;
  descriptor: string;
  register: ReturnType<typeof useForm<FormValues>>['register'];
  name: keyof FormValues;
}) => (
  <div>
    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
      <span>{label}</span>
      <span className="text-slate-500">{descriptor} ({value}/5)</span>
    </div>
    <div className="mt-3 flex items-center gap-3">
      <span className="text-xl">{iconStart}</span>
      <input type="range" min="1" max="5" step="1" {...register(name)} className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-600" />
      <span className="text-xl">{iconEnd}</span>
    </div>
  </div>
);

export const FeelingCapture: React.FC<FeelingCaptureProps> = ({ onSubmit, when, isLoading = false }) => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const { register, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      valence: '3',
      energy: '3',
      stress: '2',
      notes: '',
    },
  });

  const valence = watch('valence');
  const energy = watch('energy');
  const stress = watch('stress');

  const submit = handleSubmit((values) => {
    onSubmit({
      when,
      valence: Number(values.valence),
      energy: Number(values.energy),
      stress: Number(values.stress),
      notes: values.notes || undefined,
    });
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Feeling capture</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">
          {when === 'pre'
            ? (zh ? '训练前你感觉如何？' : 'How did you feel before?')
            : (zh ? '训练后你感觉如何？' : 'How did you feel after?')}
        </h3>
      </div>

      <ScaleField
        label={zh ? '心情' : 'Mood'}
        iconStart="😐"
        iconEnd="😊"
        value={valence}
        descriptor={(zh ? moodLabels.zh : moodLabels.en)[Number(valence) - 1]}
        register={register}
        name="valence"
      />
      <ScaleField
        label={zh ? '精力' : 'Energy'}
        iconStart="🔋"
        iconEnd="⚡"
        value={energy}
        descriptor={(zh ? energyLabels.zh : energyLabels.en)[Number(energy) - 1]}
        register={register}
        name="energy"
      />
      <ScaleField
        label={zh ? '压力' : 'Stress'}
        iconStart="😌"
        iconEnd="😰"
        value={stress}
        descriptor={(zh ? stressLabels.zh : stressLabels.en)[Number(stress) - 1]}
        register={register}
        name="stress"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700">{zh ? '备注' : 'Notes'}</label>
        <textarea
          {...register('notes')}
          rows={3}
          placeholder={when === 'pre'
            ? (zh ? '例如：状态不错、睡眠一般、有点饿、时间紧张等。' : 'Ready to go, decent sleep, hungry, rushed, etc.')
            : (zh ? '例如：感觉有力、放松了、仍有压力、精力充沛等。' : 'Felt strong, settled down, still stressed, energized, etc.')}
          className="mt-2 block w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading
          ? (zh ? '保存中...' : 'Saving...')
          : when === 'pre'
            ? (zh ? '保存训练前感受' : 'Save pre-entry feeling')
            : (zh ? '保存训练后感受' : 'Save post-entry feeling')}
      </button>
    </form>
  );
};