import { useState } from 'react';
import { X, Phone, Clock, Wrench, CheckCircle2, AlertCircle, Calendar, User, Music, ArrowRight, MessageSquare, AlertTriangle, CalendarDays } from 'lucide-react';
import type { HandpanRecord, FollowUpStatus, FollowUpCategory, FollowUpQuickFilterType } from '@/types/record';
import { calculateFollowUpQueue, getFollowUpStatusLabel, getFollowUpStatusColor, getLastContactDate, getNextFollowUpDate, getDaysDiff, getLatestTuningDate, calculateFollowUpQuickFilters } from '@/types/record';

interface FollowUpListProps {
  isOpen: boolean;
  onClose: () => void;
  records: HandpanRecord[];
  onViewFollowUpDetail: (record: HandpanRecord) => void;
  onViewTuningHistory: (record: HandpanRecord) => void;
}

const getCategoryIcon = (status: FollowUpStatus) => {
  switch (status) {
    case 'pending':
      return Clock;
    case 'contacted':
      return Phone;
    case 'needs-repair':
      return Wrench;
    case 'closed':
      return CheckCircle2;
    default:
      return AlertCircle;
  }
};

const getQuickFilterIcon = (type: FollowUpQuickFilterType) => {
  switch (type) {
    case 'overdue':
      return AlertTriangle;
    case 'this-week':
      return CalendarDays;
    default:
      return Calendar;
  }
};

export function FollowUpList({ isOpen, onClose, records, onViewFollowUpDetail, onViewTuningHistory }: FollowUpListProps) {
  const [activeTab, setActiveTab] = useState<FollowUpStatus | 'all'>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<FollowUpQuickFilterType | null>(null);
  const followUpQueue = calculateFollowUpQueue(records);
  const quickFilters = calculateFollowUpQuickFilters(records);
  const totalCount = followUpQueue.reduce((sum, r) => sum + r.count, 0);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getDisplayRecords = () => {
    if (activeQuickFilter) {
      const quickFilter = quickFilters.find(q => q.category.type === activeQuickFilter);
      return quickFilter ? quickFilter.records : [];
    }
    if (activeTab === 'all') {
      return followUpQueue.flatMap(category => category.records);
    }
    const category = followUpQueue.find(c => c.category.status === activeTab);
    return category ? category.records : [];
  };

  const displayRecords = getDisplayRecords();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brass-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-brass-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">售后回访队列</h2>
                <p className="text-sm text-ink-400">
                  已交付记录自动进入回访队列 · 共 {totalCount} 条
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

          <div className="p-6 border-b border-clay-100 bg-clay-50/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  setActiveTab('all');
                  setActiveQuickFilter(null);
                }}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                  ${activeTab === 'all' && !activeQuickFilter
                    ? 'bg-brass-50 border-brass-300 ring-2 ring-brass-200'
                    : 'bg-white border-clay-200 hover:bg-clay-50'}
                `}
              >
                <span className="text-2xl font-bold text-ink-500">{totalCount}</span>
                <span className={`text-xs mt-1 ${activeTab === 'all' && !activeQuickFilter ? 'text-brass-600 font-medium' : 'text-ink-400'}`}>
                  全部
                </span>
              </button>
              {followUpQueue.map(({ category, count }) => {
                const Icon = getCategoryIcon(category.status);
                const isActive = activeTab === category.status && !activeQuickFilter;
                return (
                  <button
                    key={category.status}
                    onClick={() => {
                      setActiveTab(category.status);
                      setActiveQuickFilter(null);
                    }}
                    className={`
                      flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                      ${isActive
                        ? `${category.bgColor} ${category.borderColor} ring-2 ring-offset-1`
                        : 'bg-white border-clay-200 hover:bg-clay-50'}
                    `}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? category.iconColor : 'text-ink-400'}`} />
                    <span className="text-2xl font-bold text-ink-500">{count}</span>
                    <span className={`text-xs mt-1 ${isActive ? category.color : 'text-ink-400'}`}>
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6 border-b border-clay-100">
            <h4 className="text-sm font-semibold text-ink-400 mb-3">快捷筛选</h4>
            <div className="grid grid-cols-2 gap-3">
              {quickFilters.map(({ category, count }) => {
                const Icon = getQuickFilterIcon(category.type);
                const isActive = activeQuickFilter === category.type;
                return (
                  <button
                    key={category.type}
                    onClick={() => {
                      setActiveQuickFilter(isActive ? null : category.type);
                      if (!isActive) {
                        setActiveTab('all');
                      }
                    }}
                    className={`
                      flex items-center justify-between p-4 rounded-xl border transition-all
                      ${isActive
                        ? `${category.bgColor} ${category.borderColor} ring-2 ring-offset-1`
                        : 'bg-white border-clay-200 hover:bg-clay-50'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${category.bgColor} ${category.borderColor} border flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${category.iconColor}`} />
                      </div>
                      <div className="text-left">
                        <span className={`text-sm font-semibold ${isActive ? category.color : 'text-ink-500'}`}>
                          {category.label}
                        </span>
                        <p className="text-xs text-ink-400">{category.description}</p>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-ink-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {displayRecords.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-clay-400" />
                </div>
                <h4 className="text-lg font-medium text-ink-500 mb-2">暂无回访记录</h4>
                <p className="text-ink-400 text-sm">
                  {activeQuickFilter
                    ? `当前没有${quickFilters.find(q => q.category.type === activeQuickFilter)?.category.label}的记录`
                    : activeTab === 'all'
                    ? '当前没有已交付的记录，交付后会自动进入回访队列'
                    : `当前没有${followUpQueue.find(c => c.category.status === activeTab)?.category.label}的记录`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayRecords.map((record) => {
                  const statusCategory = followUpQueue.find(c => c.records.some(r => r.id === record.id))?.category as FollowUpCategory;
                  const quickFilterCategory = activeQuickFilter
                    ? quickFilters.find(q => q.records.some(r => r.id === record.id))?.category
                    : null;
                  const displayCategory = quickFilterCategory || statusCategory;
                  const lastContactDate = getLastContactDate(record);
                  const nextFollowUpDate = getNextFollowUpDate(record);
                  const latestTuningDate = getLatestTuningDate(record);
                  const daysSinceTuning = getDaysDiff(latestTuningDate);
                  const daysSinceContact = lastContactDate ? getDaysDiff(lastContactDate) : null;

                  return (
                    <div
                      key={record.id}
                      className={`
                        rounded-xl p-4 border transition-all hover:shadow-md
                        ${displayCategory.bgColor} ${displayCategory.borderColor}
                      `}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getFollowUpStatusColor(statusCategory.status)}`}>
                              {getFollowUpStatusLabel(statusCategory.status)}
                            </span>
                            {quickFilterCategory && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${quickFilterCategory.bgColor} ${quickFilterCategory.color} ${quickFilterCategory.borderColor} border`}>
                                {quickFilterCategory.label}
                              </span>
                            )}
                            <span className="font-mono text-sm text-ink-500 font-medium">
                              {record.serialNumber}
                            </span>
                            <span className="text-ink-300">·</span>
                            <span className="text-sm text-ink-500">{record.mode}</span>
                            <span className="text-ink-300">·</span>
                            <span className="text-sm text-ink-500">{record.noteCount}音</span>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-ink-500 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <User className="w-4 h-4 text-ink-400" />
                              <span>{record.customerNickname}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Music className="w-4 h-4 text-ink-400" />
                              <span>调音 {record.tuningHistory.length} 次</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-ink-400" />
                              <span>上次调音 {daysSinceTuning} 天前</span>
                            </div>
                            {daysSinceContact !== null && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-ink-400" />
                                <span>上次联系 {daysSinceContact} 天前</span>
                              </div>
                            )}
                            {nextFollowUpDate && (
                              <div className="flex items-center gap-1.5 text-brass-600">
                                <Clock className="w-4 h-4" />
                                <span>下次回访 {formatDate(nextFollowUpDate)}</span>
                              </div>
                            )}
                          </div>

                          {record.followUp?.history && record.followUp.history.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-clay-200/50">
                              <p className="text-xs text-ink-400 line-clamp-1">
                                最新反馈：{record.followUp.history[record.followUp.history.length - 1].customerFeedback || '无反馈记录'}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <button
                            onClick={() => onViewFollowUpDetail(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brass-500 text-white text-sm font-medium hover:bg-brass-600 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span>回访详情</span>
                          </button>
                          <button
                            onClick={() => onViewTuningHistory(record)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-ink-500 text-sm font-medium border border-clay-200 hover:bg-clay-50 transition-colors"
                          >
                            <ArrowRight className="w-4 h-4" />
                            <span>调音历史</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-clay-100 bg-clay-50/50">
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
  );
}
