import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { AppProvider } from './context/AppProvider';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const LogEntry = lazy(() => import('./pages/LogEntry').then((module) => ({ default: module.LogEntry })));
const History = lazy(() => import('./pages/History').then((module) => ({ default: module.History })));
const Trends = lazy(() => import('./pages/Trends').then((module) => ({ default: module.Trends })));
const LoginPage = lazy(() => import('./pages/Login').then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/Signup').then((module) => ({ default: module.SignupPage })));
const WeightTracker = lazy(() => import('./pages/WeightTracker').then((module) => ({ default: module.WeightTracker })));
const AICoach = lazy(() => import('./pages/AICoach').then((module) => ({ default: module.AICoach })));
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })));

function RouteFallback() {
  const isZh = document.documentElement.lang.toLowerCase().startsWith('zh');
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{isZh ? '加载中...' : 'Loading...'}</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, logout, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fallbackPath = isAuthenticated ? '/' : '/login';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      {isAuthenticated && (
        <header className="bg-white shadow">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold text-primary">
              PulsePilot
            </Link>
            <div className="flex items-center gap-6">
              <ul className="flex gap-6">
                <li>
                  <Link to="/" className="text-gray-700 hover:text-primary transition">
                    {t('nav.home')}
                  </Link>
                </li>
                <li>
                  <Link to="/log" className="text-gray-700 hover:text-primary transition">
                    {t('nav.log')}
                  </Link>
                </li>
                <li>
                  <Link to="/history" className="text-gray-700 hover:text-primary transition">
                    {t('nav.history')}
                  </Link>
                </li>
                <li>
                  <Link to="/trends" className="text-gray-700 hover:text-primary transition">
                    {t('nav.analytics')}
                  </Link>
                </li>
                <li>
                  <Link to="/weight" className="text-gray-700 hover:text-primary transition">
                    {t('nav.weight')}
                  </Link>
                </li>
                <li>
                  <Link to="/coach" className="text-gray-700 hover:text-primary transition">
                    {t('nav.coach')}
                  </Link>
                </li>
                <li>
                  <Link to="/settings" className="text-gray-700 hover:text-primary transition">
                    {t('nav.settings')}
                  </Link>
                </li>
              </ul>
              <div className="flex items-center gap-4 border-l border-gray-300 pl-6">
                <span className="text-sm text-gray-600">
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition"
                >
                  {t('nav.logout')}
                </button>
              </div>
            </div>
          </nav>
        </header>
      )}

      {/* Main Content */}
      <main className={isAuthenticated ? "max-w-6xl mx-auto px-4 py-8" : ""}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/log"
              element={
                <ProtectedRoute>
                  <LogEntry />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Navigate to="/trends" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trends"
              element={
                <ProtectedRoute>
                  <Trends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weight"
              element={
                <ProtectedRoute>
                  <WeightTracker />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coach"
              element={
                <ProtectedRoute>
                  <AICoach />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to={fallbackPath} replace />} />
          </Routes>
        </Suspense>
      </main>

      {/* Footer */}
      {isAuthenticated && (
        <footer className="bg-gray-100 mt-16 border-t border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('footer.aboutTitle')}</h3>
                <p className="text-sm text-gray-600">
                  {t('footer.aboutBody')}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('footer.featuresTitle')}</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>{t('footer.features.log')}</li>
                  <li>{t('footer.features.feelings')}</li>
                  <li>{t('footer.features.patterns')}</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('footer.supportTitle')}</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><a href="#" className="hover:text-primary">{t('footer.support.docs')}</a></li>
                  <li><a href="#" className="hover:text-primary">{t('footer.support.contact')}</a></li>
                  <li><a href="#" className="hover:text-primary">{t('footer.support.privacy')}</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-300 pt-6 text-center text-sm text-gray-600">
              {t('footer.copyright')}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <LanguageProvider>
        <AuthProvider>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}
