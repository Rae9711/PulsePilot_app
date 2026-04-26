import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  AppLanguage,
  getKeepSignedInPreference,
  moveStoredAuthToken,
  setKeepSignedInPreference,
} from '../utils/preferences';

export const Settings: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [keepSignedIn, setKeepSignedIn] = useState<boolean>(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKeepSignedIn(getKeepSignedInPreference());
  }, []);

  const applyKeepSignedIn = (nextValue: boolean) => {
    setKeepSignedIn(nextValue);
    setKeepSignedInPreference(nextValue);
    moveStoredAuthToken(nextValue);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const applyLanguage = (nextLanguage: AppLanguage) => {
    setLanguage(nextLanguage);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="mt-2 text-slate-500">{t('settings.subtitle')}</p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.sessionTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('settings.sessionDescription')}</p>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={keepSignedIn}
            onChange={(event) => applyKeepSignedIn(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>
            <div className="text-sm font-semibold text-slate-900">{t('settings.keepSignedInLabel')}</div>
            <div className="mt-1 text-xs text-slate-600">{t('settings.keepSignedInHint')}</div>
          </span>
        </label>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.languageTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('settings.languageDescription')}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => applyLanguage('en')}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              language === 'en'
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t('settings.languageEnglish')}
          </button>
          <button
            type="button"
            onClick={() => applyLanguage('zh')}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
              language === 'zh'
                ? 'border-sky-300 bg-sky-50 text-sky-800'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t('settings.languageChinese')}
          </button>
        </div>
      </section>

      {saved && (
        <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          {t('settings.saved')}
        </div>
      )}
    </div>
  );
};
