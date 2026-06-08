import type { ModeOption, HandpanRecord } from '@/types/record';
import { DEFAULT_MODE_OPTIONS } from '@/types/record';
import { addTombstone } from './versionedBackup';

const MODE_STORAGE_KEY = 'handpan_mode_options';

export const generateModeId = (): string => {
  return 'mode-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getModes = (): ModeOption[] => {
  try {
    const data = localStorage.getItem(MODE_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    const initialized = DEFAULT_MODE_OPTIONS.map(mode => ({
      ...mode,
      createdAt: mode.createdAt || new Date().toISOString(),
      updatedAt: mode.updatedAt || new Date().toISOString(),
    }));
    saveModes(initialized);
    return initialized;
  } catch {
    return DEFAULT_MODE_OPTIONS.map(mode => ({
      ...mode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  }
};

export const saveModes = (modes: ModeOption[]): void => {
  localStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(modes));
};

export const getActiveModeNames = (): string[] => {
  const modes = getModes();
  return modes
    .filter(m => m.active)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => m.name);
};

export const getAllModeNames = (): string[] => {
  const modes = getModes();
  return modes
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(m => m.name);
};

export const addMode = (name: string): ModeOption => {
  const modes = getModes();
  const now = new Date().toISOString();
  const newMode: ModeOption = {
    id: generateModeId(),
    name: name.trim(),
    active: true,
    sortOrder: modes.length,
    createdAt: now,
    updatedAt: now,
  };
  modes.push(newMode);
  saveModes(modes);
  return newMode;
};

export const updateMode = (id: string, updates: Partial<ModeOption>): ModeOption | null => {
  const modes = getModes();
  const index = modes.findIndex(m => m.id === id);
  if (index === -1) return null;

  modes[index] = {
    ...modes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveModes(modes);
  return modes[index];
};

export const renameMode = (id: string, newName: string): ModeOption | null => {
  return updateMode(id, { name: newName.trim() });
};

export const toggleModeActive = (id: string): ModeOption | null => {
  const modes = getModes();
  const mode = modes.find(m => m.id === id);
  if (!mode) return null;
  return updateMode(id, { active: !mode.active });
};

export const moveMode = (id: string, direction: 'up' | 'down'): ModeOption[] | null => {
  const modes = getModes();
  const sortedModes = [...modes].sort((a, b) => a.sortOrder - b.sortOrder);
  const currentIndex = sortedModes.findIndex(m => m.id === id);

  if (currentIndex === -1) return null;
  if (direction === 'up' && currentIndex === 0) return null;
  if (direction === 'down' && currentIndex === sortedModes.length - 1) return null;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  const currentMode = sortedModes[currentIndex];
  const targetMode = sortedModes[targetIndex];

  const updatedModes = modes.map(m => {
    if (m.id === currentMode.id) {
      return { ...m, sortOrder: targetMode.sortOrder, updatedAt: new Date().toISOString() };
    }
    if (m.id === targetMode.id) {
      return { ...m, sortOrder: currentMode.sortOrder, updatedAt: new Date().toISOString() };
    }
    return m;
  });

  saveModes(updatedModes);
  return updatedModes;
};

export const getUsedModeNames = (records: HandpanRecord[]): string[] => {
  const usedModes = new Set(records.map(r => r.mode));
  return Array.from(usedModes);
};

export const getModeOptionsForForm = (): string[] => {
  return getActiveModeNames();
};

export const getModeOptionsForFilter = (records: HandpanRecord[]): { value: string; label: string; disabled: boolean }[] => {
  const modes = getModes();
  const usedModeNames = new Set(getUsedModeNames(records));

  const sortedModes = [...modes].sort((a, b) => a.sortOrder - b.sortOrder);
  const result: { value: string; label: string; disabled: boolean }[] = [];

  sortedModes.forEach(mode => {
    result.push({
      value: mode.name,
      label: mode.active ? mode.name : `${mode.name} (已停用)`,
      disabled: !mode.active,
    });
  });

  usedModeNames.forEach(name => {
    if (!sortedModes.some(m => m.name === name)) {
      result.push({
        value: name,
        label: `${name} (已删除)`,
        disabled: true,
      });
    }
  });

  return result;
};

export const getDisplayModeName = (modeName: string): string => {
  return modeName;
};

export const deleteMode = (id: string): boolean => {
  const modes = getModes();
  const filtered = modes.filter(m => m.id !== id);
  if (filtered.length === modes.length) return false;
  saveModes(filtered);
  addTombstone(id, 'mode');
  return true;
};

export const getModeByName = (name: string): ModeOption | undefined => {
  const modes = getModes();
  return modes.find(m => m.name === name);
};

export const getModePhonemeTemplate = (modeName: string): { noteCount: number; phonemeNames: string[] } | null => {
  const mode = getModeByName(modeName);
  if (!mode || !mode.phonemeDeviations || mode.phonemeDeviations.length === 0) {
    return null;
  }
  return {
    noteCount: mode.phonemeDeviations.length,
    phonemeNames: mode.phonemeDeviations.map(d => d.name),
  };
};

export const updateModePhonemeTemplate = (id: string, phonemeNames: string[]): ModeOption | null => {
  const modes = getModes();
  const index = modes.findIndex(m => m.id === id);
  if (index === -1) return null;

  const phonemeDeviations = phonemeNames.map(name => ({
    name,
    beforeDeviation: null,
    afterDeviation: null,
    remark: '',
  }));

  modes[index] = {
    ...modes[index],
    phonemeDeviations,
    updatedAt: new Date().toISOString(),
  };
  saveModes(modes);
  return modes[index];
};
