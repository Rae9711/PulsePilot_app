import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const featureItems = {
  en: [
    {
      title: 'Log workouts and meals',
      detail: 'Capture what you did in seconds with pre and post feeling context.',
    },
    {
      title: 'See personal patterns',
      detail: 'Find what improves mood, energy, and stress based on your own baseline.',
    },
    {
      title: 'Get daily insight prompts',
      detail: 'Receive practical suggestions you can test in your next session.',
    },
    {
      title: 'Track momentum over time',
      detail: 'Review trends weekly to stay consistent and avoid burnout patterns.',
    },
  ],
  zh: [
    {
      title: '记录训练和饮食',
      detail: '几秒完成记录，包含训练前后感受。',
    },
    {
      title: '查看个人模式',
      detail: '基于你的基线找到影响心情、精力与压力的关键因素。',
    },
    {
      title: '获得每日洞察提示',
      detail: '拿到可在下一次训练中验证的实用建议。',
    },
    {
      title: '长期追踪动量',
      detail: '每周回顾趋势，保持一致并避免过度疲劳。',
    },
  ],
} as const;

export const LoginPage: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : (zh ? '登录失败' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (userEmail: string) => {
    setEmail(userEmail);
    setPassword('password123');
  };

  return (
    <div className="auth-noise relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#d8f2e8_0,#f5fbf8_45%,#eef8ff_100%)] p-4 md:p-8">
      <div className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl animate-float-slow" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <section className="animate-rise px-2 lg:px-8">
          <div className="rounded-3xl border border-slate-200/80 bg-white/75 p-6 backdrop-blur md:p-8">
            <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
              {zh ? 'AI 驱动健身洞察' : 'AI-powered fitness insights'}
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
              {zh ? '几分钟看懂你的身体模式' : 'Understand your body patterns in minutes'}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              {zh ? '把训练、饮食和感受转化为清晰建议，让训练更聪明、恢复更高效。' : 'Turn your workouts, meals, and feelings into clear guidance so you can train smarter and recover better.'}
            </p>
            <button
              type="button"
              onClick={() => fillDemoCredentials('athena@example.com')}
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {zh ? '免费试用' : 'Try it free'}
            </button>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200/80 bg-white/75 p-6 backdrop-blur md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{zh ? '功能与价值' : 'Features and benefits'}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(zh ? featureItems.zh : featureItems.en).map((item) => (
                <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-slate-800">
            <p className="text-sm font-medium">Ready to build your own pattern engine?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
              >
                {zh ? '创建免费账号' : 'Create free account'}
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('cora@example.com')}
                className="rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                {zh ? '体验演示账号' : 'Explore demo'}
              </button>
            </div>
          </div>
        </section>

        <section className="animate-rise rounded-3xl border border-slate-200/70 bg-white/90 p-7 shadow-2xl backdrop-blur md:p-9">
          <div className="mb-7">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-600">{zh ? '登录后继续你的进展。' : 'Sign in to continue your momentum.'}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                {zh ? '邮箱' : 'Email'}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                placeholder={zh ? 'you@example.com' : 'you@example.com'}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                {zh ? '密码' : 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                placeholder={zh ? '请输入密码' : 'Enter your password'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (zh ? '登录中...' : 'Logging in...') : (zh ? '登录' : 'Login')}
            </button>
          </form>

          <div className="mt-6">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{zh ? '试用演示账号' : 'Try demo accounts'}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => fillDemoCredentials('athena@example.com')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Athena
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('boris@example.com')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Boris
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('cora@example.com')}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50"
              >
                Cora
              </button>
            </div>
          </div>

          <div className="mt-7 text-center text-sm text-slate-600">
            {zh ? '还没有账号？' : 'No account yet?'}{' '}
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="font-semibold text-emerald-700 transition hover:text-emerald-600"
            >
              {zh ? '立即创建' : 'Create one'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
