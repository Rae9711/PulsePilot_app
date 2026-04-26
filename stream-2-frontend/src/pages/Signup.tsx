import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export const SignupPage: React.FC = () => {
  const { language } = useLanguage();
  const zh = language === 'zh';
  const PASSWORD_POLICY_HINT = 'Use at least 8 characters with uppercase, lowercase, and a number.';
  const PASSWORD_POLICY_PATTERN = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await signup(email, password, name);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : (zh ? '注册失败' : 'Signup failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-noise relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_20%_20%,#d8f2e8_0,#f5fbf8_45%,#eef8ff_100%)] p-4 md:p-8">
      <div className="pointer-events-none absolute top-10 left-8 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-10 right-6 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl animate-float-slow" />

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <section className="animate-rise px-2 lg:px-8">
          <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            {zh ? '免费开始' : 'Start free'}
          </p>
          <h1 className="mt-6 max-w-xl text-4xl font-bold leading-tight text-slate-900 md:text-5xl">
            {zh ? '创建你的个人表现地图' : 'Create your personal performance map'}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
            {zh ? '加入 PulsePilot，把日常活动转化为清晰、个性化的教练信号。' : 'Join PulsePilot to turn daily activity into clear, personalized coaching signals.'}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{zh ? '不靠猜' : 'No guesswork'}</div>
              <div className="mt-1 text-sm text-slate-700">{zh ? '洞察来自你的真实数据' : 'Insights from your own data'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{zh ? '快速上手' : 'Quick setup'}</div>
              <div className="mt-1 text-sm text-slate-700">{zh ? '2 分钟完成第一条记录' : 'Track your first entry in 2 minutes'}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 backdrop-blur">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{zh ? '信任' : 'Trust'}</div>
              <div className="mt-1 text-sm text-slate-700">{zh ? '已有 10,000+ 用户加入' : '10,000+ users already onboard'}</div>
            </div>
          </div>
        </section>

        <section className="animate-rise rounded-3xl border border-slate-200/70 bg-white/90 p-7 shadow-2xl backdrop-blur md:p-9">
          <div className="mb-7">
            <h2 className="text-3xl font-bold text-slate-900">{zh ? '创建账号' : 'Create account'}</h2>
            <p className="mt-2 text-slate-600">{zh ? '免费开始，今天建立你的第一条基线。' : 'Start free and build your first baseline today.'}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-700">
                {zh ? '姓名（可选）' : 'Name (Optional)'}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                placeholder={zh ? '你的姓名' : 'Your name'}
              />
            </div>

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
                placeholder="you@example.com"
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
                minLength={8}
                pattern={PASSWORD_POLICY_PATTERN}
                title={PASSWORD_POLICY_HINT}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0 transition focus:border-emerald-500 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.16)]"
                placeholder={zh ? '至少8位，含大小写字母与数字' : '8+ chars, upper/lowercase + number'}
              />
              <p className="mt-1 text-xs text-slate-500">{zh ? '至少 8 位，包含大写、小写和数字。' : PASSWORD_POLICY_HINT}</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (zh ? '创建中...' : 'Creating account...') : (zh ? '创建免费账号' : 'Create free account')}
            </button>
          </form>

          <div className="mt-7 text-center text-sm text-slate-600">
            {zh ? '已有账号？' : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-semibold text-emerald-700 transition hover:text-emerald-600"
            >
              {zh ? '去登录' : 'Login'}
            </button>
          </div>
        </section>
        </div>
    </div>
  );
};
