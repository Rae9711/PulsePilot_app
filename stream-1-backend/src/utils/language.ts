import type { Request } from 'express';

export type AppLanguage = 'en' | 'zh';

export const resolveRequestLanguage = (req: Request): AppLanguage => {
  const raw = String(req.headers['x-app-language'] ?? req.headers['accept-language'] ?? '').toLowerCase();
  if (raw.includes('zh')) {
    return 'zh';
  }
  return 'en';
};

export const isChineseLanguage = (language: AppLanguage): boolean => language === 'zh';
