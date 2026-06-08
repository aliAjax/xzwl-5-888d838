import { useState } from 'react';
import { Filter, Search, X, ListTodo, BookmarkPlus, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react';
import type { FilterState, DeliveryStatus, HandpanRecord, FilterView } from '@/types/record';
import { DELIVERY_STATUS_OPTIONS } from '@/types/record';
import { getModeOptionsForFilter } from '@/utils/modeStorage';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  records: HandpanRecord[];
  onOpenWorkbench: () => void;
  views: FilterView[];
  activeViewId: string | null;
  onSaveView: (name: string) => void;
  onDeleteView: (id: string) => void;
  onRenameView: (id: string, name: string) => void;
  onSelectView: (id: string | null) => void;
  onRefreshViews: () => void;
}

export function FilterBar({
  filters,
  onFilterChange,
  records,
  onOpenWorkbench,
  views,
  activeViewId,
  onSaveView,
  onDeleteView,
  onRenameView,
  onSelectView,
  onRefreshViews,
}: FilterBarProps) {
  const modeOptions = getModeOptionsForFilter(records);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [editingViewId, setEditingViewId] = useState<string | null>(null);
  const [editingViewName, setEditingViewName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleModeChange = (mode: string) => {
    onFilterChange({ ...filters, mode, reminderType: '' });
    onSelectView(null);
  };

  const handleStatusChange = (deliveryStatus: DeliveryStatus | '') => {
    onFilterChange({ ...filters, deliveryStatus, reminderType: '' });
    onSelectView(null);
  };

  const handleSearchChange = (search: string) => {
    onFilterChange({ ...filters, search, reminderType: '' });
    onSelectView(null);
  };

  const handleClear = () => {
    onFilterChange({ mode: '', deliveryStatus: '', search: '', reminderType: '' });
    onSelectView(null);
  };

  const hasActiveFilters = filters.mode || filters.deliveryStatus || filters.search || filters.reminderType;

  const handleOpenSaveDialog = () => {
    setNewViewName('');
    setShowSaveDialog(true);
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) return;
    onSaveView(newViewName.trim());
    setShowSaveDialog(false);
    setNewViewName('');
    onRefreshViews();
  };

  const handleSelectView = (viewId: string) => {
    if (viewId === activeViewId) {
      onSelectView(null);
    } else {
      onSelectView(viewId);
    }
    setOpenMenuId(null);
  };

  const handleOpenRenameDialog = (view: FilterView, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingViewId(view.id);
    setEditingViewName(view.name);
    setOpenMenuId(null);
  };

  const handleRenameView = () => {
    if (!editingViewId || !editingViewName.trim()) return;
    onRenameView(editingViewId, editingViewName.trim());
    setEditingViewId(null);
    setEditingViewName('');
    onRefreshViews();
  };

  const handleDeleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个视图吗？')) {
      if (activeViewId === viewId) {
        onSelectView(null);
      }
      onDeleteView(viewId);
      onRefreshViews();
    }
    setOpenMenuId(null);
  };

  const toggleMenu = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === viewId ? null : viewId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {views.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-ink-400 mr-1">常用视图：</span>
          {views.map((view) => (
            <div key={view.id} className="relative">
              {editingViewId === view.id ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brass-50 border border-brass-300">
                  <input
                    type="text"
                    value={editingViewName}
                    onChange={(e) => setEditingViewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameView();
                      if (e.key === 'Escape') {
                        setEditingViewId(null);
                        setEditingViewName('');
                      }
                    }}
                    className="w-24 px-1 py-0.5 text-sm bg-transparent border-b border-brass-400 focus:outline-none text-ink-600"
                    autoFocus
                  />
                  <button
                    onClick={handleRenameView}
                    className="p-0.5 text-brass-600 hover:text-brass-700"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingViewId(null);
                      setEditingViewName('');
                    }}
                    className="p-0.5 text-ink-400 hover:text-ink-500"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSelectView(view.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeViewId === view.id
                      ? 'bg-brass-500 text-white shadow-sm'
                      : 'bg-white text-ink-500 border border-clay-200 hover:border-brass-300 hover:text-brass-600'
                  }`}
                >
                  <span>{view.name}</span>
                  <button
                    onClick={(e) => toggleMenu(view.id, e)}
                    className={`ml-0.5 p-0.5 rounded ${
                      activeViewId === view.id
                        ? 'hover:bg-white/20 text-white/80'
                        : 'hover:bg-clay-100 text-ink-400'
                    }`}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </button>
              )}
              
              {openMenuId === view.id && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setOpenMenuId(null)}
                  />
                  <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-clay-200 py-1 z-20">
                    <button
                      onClick={(e) => handleOpenRenameDialog(view, e)}
                      className="w-full px-3 py-1.5 text-left text-sm text-ink-500 hover:bg-clay-50 flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      重命名
                    </button>
                    <button
                      onClick={(e) => handleDeleteView(view.id, e)}
                      className="w-full px-3 py-1.5 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          
          <button
            onClick={handleOpenSaveDialog}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-brass-600 bg-brass-50 border border-brass-200 hover:bg-brass-100 transition-colors"
            title="保存当前筛选为视图"
          >
            <BookmarkPlus className="w-4 h-4" />
            保存视图
          </button>
        </div>
      )}

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border border-clay-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Filter className="w-5 h-5 text-clay-500" />
          <span className="font-semibold text-ink-500">筛选记录</span>
          
          <div className="mx-3 h-6 w-px bg-clay-200" />
          
          <button
            onClick={onOpenWorkbench}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass-500 text-white text-sm font-medium hover:bg-brass-600 transition-colors"
          >
            <ListTodo className="w-4 h-4" />
            <span>调音工作台</span>
          </button>
          
          {views.length === 0 && hasActiveFilters && (
            <button
              onClick={handleOpenSaveDialog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-brass-600 bg-brass-50 border border-brass-200 hover:bg-brass-100 transition-colors"
            >
              <BookmarkPlus className="w-4 h-4" />
              保存为视图
            </button>
          )}
          
          {hasActiveFilters && (
            <button
              onClick={handleClear}
              className="ml-auto inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-500 transition-colors"
            >
              <X className="w-4 h-4" />
              清除筛选
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-300" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="搜索编号、客户昵称..."
                className="input-field pl-10"
              />
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">调式</label>
            <select
              value={filters.mode}
              onChange={(e) => handleModeChange(e.target.value)}
              className="select-field"
            >
              <option value="">全部调式</option>
              {modeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm text-ink-400 mb-1.5">交付状态</label>
            <select
              value={filters.deliveryStatus}
              onChange={(e) => handleStatusChange(e.target.value as DeliveryStatus | '')}
              className="select-field"
            >
              <option value="">全部状态</option>
              {DELIVERY_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {showSaveDialog && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowSaveDialog(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-96 bg-white rounded-2xl shadow-xl p-6 z-50">
            <h3 className="text-lg font-semibold text-ink-500 mb-4">保存为常用视图</h3>
            <p className="text-sm text-ink-400 mb-4">
              将当前的筛选条件（调式、交付状态、搜索关键词）保存为命名视图，方便快速切换。
            </p>
            <div className="mb-4">
              <label className="block text-sm text-ink-400 mb-1.5">视图名称</label>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveView();
                  if (e.key === 'Escape') setShowSaveDialog(false);
                }}
                placeholder="例如：待交付D Kurd"
                className="input-field w-full"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ink-500 hover:bg-clay-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveView}
                disabled={!newViewName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-brass-500 text-white hover:bg-brass-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
