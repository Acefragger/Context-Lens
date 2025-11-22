import { HistoryItem, UserProfile, FullAnalysisResponse } from "../types";

const USER_KEY = 'context_lens_user';
const HISTORY_KEY = 'context_lens_history';

export const StorageService = {
  getUser: (): UserProfile | null => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  saveUser: (user: UserProfile): void => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser: (): void => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(HISTORY_KEY); // Optional: clear history on logout
  },

  getHistory: (): HistoryItem[] => {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addToHistory: (
    imagePreview: string, 
    note: string, 
    result: FullAnalysisResponse
  ): void => {
    const history = StorageService.getHistory();
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      imagePreview, // Warning: storing large base64 strings in localStorage has limits (usually ~5MB total)
      note,
      result
    };
    
    // Keep last 10 items to avoid quota limits
    const updatedHistory = [newItem, ...history].slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  },

  deleteHistoryItem: (id: string): HistoryItem[] => {
    const history = StorageService.getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  }
};