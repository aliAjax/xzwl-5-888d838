import type { FilterView, FilterState } from '@/types/record';

const STORAGE_KEY = 'handpan_filter_views';

export const generateViewId = (): string => {
  return 'view-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getViews = (): FilterView[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveViews = (views: FilterView[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
};

export const addView = (name: string, filters: FilterState): FilterView => {
  const views = getViews();
  const now = new Date().toISOString();
  
  const newView: FilterView = {
    id: generateViewId(),
    name,
    filters: { ...filters },
    createdAt: now,
    updatedAt: now,
  };
  
  views.push(newView);
  saveViews(views);
  return newView;
};

export const updateView = (id: string, updates: Partial<Omit<FilterView, 'id' | 'createdAt'>>): FilterView | null => {
  const views = getViews();
  const index = views.findIndex(v => v.id === id);
  if (index === -1) return null;
  
  const now = new Date().toISOString();
  views[index] = {
    ...views[index],
    ...updates,
    updatedAt: now,
  };
  
  saveViews(views);
  return views[index];
};

export const renameView = (id: string, name: string): FilterView | null => {
  return updateView(id, { name });
};

export const deleteView = (id: string): boolean => {
  const views = getViews();
  const filtered = views.filter(v => v.id !== id);
  if (filtered.length === views.length) return false;
  saveViews(filtered);
  return true;
};

export const getViewById = (id: string): FilterView | undefined => {
  const views = getViews();
  return views.find(v => v.id === id);
};
