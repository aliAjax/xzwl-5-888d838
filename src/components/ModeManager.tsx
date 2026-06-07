import { useState, useEffect } from 'react';
import { X, Plus, ChevronUp, ChevronDown, Edit2, Check, X as XIcon, Power, Music2 } from 'lucide-react';
import type { ModeOption } from '@/types/record';
import { getModes, addMode, renameMode, toggleModeActive, moveMode } from '@/utils/modeStorage';

interface ModeManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ModeManager({ isOpen, onClose }: ModeManagerProps) {
  const [modes, setModes] = useState<ModeOption[]>([]);
  const [newModeName, setNewModeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  const loadModes = () => {
    const loadedModes = getModes();
    setModes(loadedModes.sort((a, b) => a.sortOrder - b.sortOrder));
  };

  useEffect(() => {
    if (isOpen) {
      loadModes();
      setNewModeName('');
      setEditingId(null);
      setError('');
    }
  }, [isOpen]);

  const handleAddMode = () => {
    const trimmedName = newModeName.trim();
    if (!trimmedName) {
      setError('请输入调式名称');
      return;
    }

    const existingNames = modes.map(m => m.name);
    if (existingNames.includes(trimmedName)) {
      setError('该调式名称已存在');
      return;
    }

    addMode(trimmedName);
    setNewModeName('');
    setError('');
    loadModes();
  };

  const handleStartEdit = (mode: ModeOption) => {
    setEditingId(mode.id);
    setEditingName(mode.name);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setError('');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const trimmedName = editingName.trim();
    if (!trimmedName) {
      setError('请输入调式名称');
      return;
    }

    const existingNames = modes.filter(m => m.id !== editingId).map(m => m.name);
    if (existingNames.includes(trimmedName)) {
      setError('该调式名称已存在');
      return;
    }

    renameMode(editingId, trimmedName);
    setEditingId(null);
    setEditingName('');
    setError('');
    loadModes();
  };

  const handleToggleActive = (id: string) => {
    toggleModeActive(id);
    loadModes();
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const sortedModes = [...modes].sort((a, b) => a.sortOrder - b.sortOrder);
    const currentIndex = sortedModes.findIndex(m => m.id === id);

    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedModes.length - 1) return;

    moveMode(id, direction);
    loadModes();
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (editingId) {
        handleCancelEdit();
      } else {
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const sortedModes = [...modes].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clay-400 to-clay-600 flex items-center justify-center">
                <Music2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">
                  调式资料管理
                </h2>
                <p className="text-xs text-ink-400">
                  管理可用的调式选项库
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-ink-400 hover:text-ink-500 hover:bg-clay-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={newModeName}
                onChange={(e) => setNewModeName(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, handleAddMode)}
                placeholder="输入新调式名称..."
                className="input-field flex-1"
              />
              <button
                onClick={handleAddMode}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>添加</span>
              </button>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <div className="border border-clay-100 rounded-xl overflow-hidden">
              <div className="bg-clay-50 px-4 py-2.5 border-b border-clay-100">
                <div className="flex items-center justify-between text-xs text-ink-400 font-medium">
                  <span>调式名称（{sortedModes.length} 个）</span>
                  <span>操作</span>
                </div>
              </div>
              <div className="divide-y divide-clay-50 max-h-80 overflow-y-auto">
                {sortedModes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-ink-400 text-sm">
                    暂无调式选项，请添加新调式
                  </div>
                ) : (
                  sortedModes.map((mode, index) => (
                    <div
                      key={mode.id}
                      className={`px-4 py-3 flex items-center gap-3 transition-colors ${
                        !mode.active ? 'bg-gray-50' : 'hover:bg-clay-50'
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMove(mode.id, 'up')}
                          disabled={index === 0}
                          className={`p-0.5 rounded ${
                            index === 0
                              ? 'text-ink-200 cursor-not-allowed'
                              : 'text-ink-400 hover:text-ink-500 hover:bg-clay-100'
                          } transition-colors`}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMove(mode.id, 'down')}
                          disabled={index === sortedModes.length - 1}
                          className={`p-0.5 rounded ${
                            index === sortedModes.length - 1
                              ? 'text-ink-200 cursor-not-allowed'
                              : 'text-ink-400 hover:text-ink-500 hover:bg-clay-100'
                          } transition-colors`}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {editingId === mode.id ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                            autoFocus
                            className="input-field py-1.5 px-2 text-sm flex-1"
                          />
                          <button
                            onClick={handleSaveEdit}
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 rounded-lg text-ink-400 hover:bg-clay-100 transition-colors"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span
                              className={`text-sm font-medium ${
                                mode.active ? 'text-ink-500' : 'text-ink-300 line-through'
                              }`}
                            >
                              {mode.name}
                            </span>
                            {!mode.active && (
                              <span className="ml-2 text-xs text-ink-400">
                                (已停用)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(mode)}
                              className="p-1.5 rounded-lg text-ink-400 hover:text-clay-500 hover:bg-clay-50 transition-colors"
                              title="重命名"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleActive(mode.id)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                mode.active
                                  ? 'text-ink-400 hover:text-amber-500 hover:bg-amber-50'
                                  : 'text-green-500 hover:bg-green-50'
                              }`}
                              title={mode.active ? '停用' : '启用'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-brass-50 border border-brass-200 rounded-xl p-3">
              <p className="text-xs text-brass-700">
                <span className="font-semibold">提示：</span>
                停用的调式将不会出现在新增记录的选项中，但已有的历史记录仍会正常显示。重命名调式不会影响历史记录的展示。
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
