import React, { useReducer, useCallback, useEffect } from 'react';
import { AppContext, AppContextType } from './AppContext';
import { Entry, Insight, TrendsData } from '../types/index';
import { useAuth } from './AuthContext';

interface AppState {
  userId: string;
  entries: Entry[];
  insights: Insight[];
  trendsData: TrendsData | null;
  loading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'SET_USER_ID'; payload: string }
  | { type: 'SET_ENTRIES'; payload: Entry[] }
  | { type: 'ADD_ENTRY'; payload: Entry }
  | { type: 'SET_INSIGHTS'; payload: Insight[] }
  | { type: 'DISMISS_INSIGHT'; payload: string }
  | { type: 'SET_TRENDS_DATA'; payload: TrendsData }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' };

const initialState: AppState = {
  userId: '',
  entries: [],
  insights: [],
  trendsData: null,
  loading: false,
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER_ID':
      return { ...state, userId: action.payload };
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload };
    case 'ADD_ENTRY':
      return { ...state, entries: [action.payload, ...state.entries] };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.payload };
    case 'DISMISS_INSIGHT':
      return {
        ...state,
        insights: state.insights.filter((i) => i.id !== action.payload),
      };
    case 'SET_TRENDS_DATA':
      return { ...state, trendsData: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

interface AppProviderProps {
  children: React.ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(appReducer, initialState);

  const setUserId = useCallback((userId: string) => {
    dispatch({ type: 'SET_USER_ID', payload: userId });
  }, []);

  const setEntries = useCallback((entries: Entry[]) => {
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const addEntry = useCallback((entry: Entry) => {
    dispatch({ type: 'ADD_ENTRY', payload: entry });
  }, []);

  const setInsights = useCallback((insights: Insight[]) => {
    dispatch({ type: 'SET_INSIGHTS', payload: insights });
  }, []);

  const dismissInsight = useCallback((insightId: string) => {
    dispatch({ type: 'DISMISS_INSIGHT', payload: insightId });
  }, []);

  const setTrendsData = useCallback((data: TrendsData) => {
    dispatch({ type: 'SET_TRENDS_DATA', payload: data });
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Keep AppState.userId in sync with the authenticated user
  useEffect(() => {
    if (user?.id) {
      dispatch({ type: 'SET_USER_ID', payload: user.id });
    }
  }, [user?.id]);

  const value: AppContextType = {
    ...state,
    setUserId,
    setEntries,
    addEntry,
    setInsights,
    dismissInsight,
    setTrendsData,
    setLoading,
    setError,
    clearError,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = (): AppContextType => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
