import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppLanguage, getSavedLanguage, setSavedLanguage } from '../utils/preferences';

type TranslationKey =
  | 'nav.home'
  | 'nav.log'
  | 'nav.history'
  | 'nav.analytics'
  | 'nav.weight'
  | 'nav.coach'
  | 'nav.settings'
  | 'nav.logout'
  | 'footer.aboutTitle'
  | 'footer.aboutBody'
  | 'footer.featuresTitle'
  | 'footer.features.log'
  | 'footer.features.feelings'
  | 'footer.features.patterns'
  | 'footer.supportTitle'
  | 'footer.support.docs'
  | 'footer.support.contact'
  | 'footer.support.privacy'
  | 'footer.copyright'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.languageTitle'
  | 'settings.languageDescription'
  | 'settings.sessionTitle'
  | 'settings.sessionDescription'
  | 'settings.keepSignedInLabel'
  | 'settings.keepSignedInHint'
  | 'settings.languageEnglish'
  | 'settings.languageChinese'
  | 'settings.saved';

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.log': 'Log',
    'nav.history': 'History',
    'nav.analytics': 'Analytics',
    'nav.weight': 'Weight',
    'nav.coach': 'AI Coach',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'footer.aboutTitle': 'About',
    'footer.aboutBody': 'PulsePilot helps you understand the relationship between your fitness, nutrition, and wellbeing.',
    'footer.featuresTitle': 'Features',
    'footer.features.log': 'Log workouts and meals',
    'footer.features.feelings': 'Track feelings and emotions',
    'footer.features.patterns': 'Discover personal patterns',
    'footer.supportTitle': 'Support',
    'footer.support.docs': 'Documentation',
    'footer.support.contact': 'Contact',
    'footer.support.privacy': 'Privacy',
    'footer.copyright': '© 2026 PulsePilot. Performance analytics for a healthier you.',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage language and session preferences.',
    'settings.languageTitle': 'Language',
    'settings.languageDescription': 'Choose your app language.',
    'settings.sessionTitle': 'Session',
    'settings.sessionDescription': 'Control whether your account stays signed in after closing the browser.',
    'settings.keepSignedInLabel': 'Keep me signed in until I log out',
    'settings.keepSignedInHint': 'When enabled, you stay logged in across browser restarts.',
    'settings.languageEnglish': 'English',
    'settings.languageChinese': 'Chinese',
    'settings.saved': 'Saved',
  },
  zh: {
    'nav.home': '首页',
    'nav.log': '记录',
    'nav.history': '历史',
    'nav.analytics': '分析',
    'nav.weight': '体重',
    'nav.coach': 'AI 教练',
    'nav.settings': '设置',
    'nav.logout': '退出登录',
    'footer.aboutTitle': '关于',
    'footer.aboutBody': 'PulsePilot 帮助你理解训练、营养和身心状态之间的关系。',
    'footer.featuresTitle': '功能',
    'footer.features.log': '记录训练和饮食',
    'footer.features.feelings': '记录情绪和感受',
    'footer.features.patterns': '发现个人模式',
    'footer.supportTitle': '支持',
    'footer.support.docs': '文档',
    'footer.support.contact': '联系我们',
    'footer.support.privacy': '隐私',
    'footer.copyright': '© 2026 PulsePilot。用数据支持更健康的训练。',
    'settings.title': '设置',
    'settings.subtitle': '管理语言和登录偏好。',
    'settings.languageTitle': '语言',
    'settings.languageDescription': '选择应用显示语言。',
    'settings.sessionTitle': '登录会话',
    'settings.sessionDescription': '控制关闭浏览器后是否保持登录状态。',
    'settings.keepSignedInLabel': '除非我主动退出，否则保持登录',
    'settings.keepSignedInHint': '开启后，重启浏览器也无需重复登录。',
    'settings.languageEnglish': '英文',
    'settings.languageChinese': '中文',
    'settings.saved': '已保存',
  },
};

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(getSavedLanguage);

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const setLanguage = (nextLanguage: AppLanguage) => {
    setLanguageState(nextLanguage);
    setSavedLanguage(nextLanguage);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
