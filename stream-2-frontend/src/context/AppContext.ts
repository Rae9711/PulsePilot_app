import { createContext } from 'react';
import { Entry, Insight, TrendsData } from '../types/index';

export interface AppContextType {
  userId: string;
  entries: Entry[];
  insights: Insight[];
  trendsData: TrendsData | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setUserId: (userId: string) => void;
  setEntries: (entries: Entry[]) => void;
  addEntry: (entry: Entry) => void;
  setInsights: (insights: Insight[]) => void;
  dismissInsight: (insightId: string) => void;
  setTrendsData: (data: TrendsData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
