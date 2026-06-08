import { useState, useEffect } from 'react';
import { X, Plus, Calendar, User, Tag, Hash, Clock, Phone, MessageSquare, FileText, ArrowRight, Music, Trash2 } from 'lucide-react';
import type { HandpanRecord, FollowUpRecord, FollowUpStatus } from '@/types/record';
import { getStatusLabel, getStatusColor, getFollowUpStatusLabel, getFollowUpStatusColor, FOLLOW_UP_STATUS_OPTIONS, getLatestTuningDate, getDaysDiff } from '@/types/record';

interface FollowUpDetailProps {
  isOpen: boolean;
  onClose: () => void;
  record: HandpanRecord | null;
  onAddFollowUp: (recordId: string, data: Omit<FollowUpRecord, 'id' | 'recordId' | 'createdAt' | 'updatedAt'>, status?: FollowUpStatus) => void;
  onUpdateStatus: (recordId: string, status: FollowUpStatus) => void;
  onDeleteFollowUp: (recordId: string, followUpId: string) => void;
  onViewTuningHistory: (record: HandpanRecord) => void;
}

interface FollowUpFormData {
  contactDate: string;
  customerFeedback: string;
  nextFollowUpDate: string;
  notes: string;
}

export function FollowUpDetail({ isOpen, onClose, record, onAddFollowUp, onUpdateStatus, onDeleteFollowUp, onViewTuningHistory }: FollowUpDetailProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<FollowUpFormData>({
    contactDate: new Date().toISOString().split('T')[0],
    customerFeedback: '',
    nextFollowUpDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [selectedStatus, setSelectedStatus] = useState<FollowUpStatus>('pending');

  useEffect(() => {
    if (isOpen && record) {
      setFormData({
        contactDate: new Date().toISOString().split('T')[0],
        customerFeedback: '',
        nextFollowUpDate: '',
        notes: '',
      });
      setShowAddForm(false);
      setErrors({});
      setSelectedStatus(record.followUp?.status || 'pending');
    }
  }, [isOpen, record]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};
    
    if (!formData.contactDate.trim()) {
      newErrors.contactDate = '请选择联系日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !record) return;

    const nextDate = formData.nextFollowUpDate.trim() || null;

    onAddFollowUp(
      record.id,
      {
        contactDate: formData.contactDate,
        customerFeedback: formData.customerFeedback,
        nextFollowUpDate: nextDate,
        notes: formData.notes,
      },
      nextDate ? 'contacted' : undefined
    );

    setFormData({
      contactDate: new Date().toISOString().split('T')[0],
      customerFeedback: '',
      nextFollowUpDate: '',
      notes: '',
    });
    setShowAddForm(false);
    setErrors({});
  };

  const handleChange = (field: keyof FollowUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleStatusChange = (status: FollowUpStatus) => {
    if (!record) return;
    setSelectedStatus(status);
    onUpdateStatus(record.id, status);
  };

  const handleDelete = (followUpId: string) => {
    if (!record) return;
    if (confirm('确定要删除这条回访记录吗？')) {
      onDeleteFollowUp(record.id, followUpId);
    }
  };

  const sortedHistory = record?.followUp?.history
    ? [...record.followUp.history].sort((a, b) => 
        new Date(b.contactDate).getTime() - new Date(a.contactDate).getTime()
      )
    : [];

  const followUpStatus = record?.followUp?.status || 'pending';
  const latestTuningDate = record ? getLatestTuningDate(record) : '';
  const daysSinceTuning = record ? getDaysDiff(latestTuningDate) : 0;

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brass-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-brass-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">售后回访详情</h2>
                <p className="text-sm text-ink-400">
                  <span className="font-mono font-semibold">{record.serialNumber}</span>
                  <span className="mx-2">·</span>
                  <span>{record.customerNickname}</span>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-ink-400" />
                <div>
                  <p className="text-xs text-ink-400">调式</p>
                  <p className="text-sm font-medium text-ink-500">{record.mode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-ink-400" />
                <div>
                  <p className="text-xs text-ink-400">音位</p>
                  <p className="text-sm font-medium text-ink-500">{record.noteCount} 音</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-ink-400" />
                <div>
                  <p className="text-xs text-ink-400">客户</p>
                  <p className="text-sm font-medium text-ink-500">{record.customerNickname}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ink-400" />
                <div>
                  <p className="text-xs text-ink-400">交付状态</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(record.deliveryStatus)}`}>
                    {getStatusLabel(record.deliveryStatus)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-ink-400">回访状态：</span>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium ${getFollowUpStatusColor(followUpStatus)}`}>
                    {getFollowUpStatusLabel(followUpStatus)}
                  </span>
                </div>
                {record.followUp?.lastContactDate && (
                  <div className="flex items-center gap-1.5 text-sm text-ink-500">
                    <Calendar className="w-4 h-4 text-ink-400" />
                    <span>上次联系 {formatDate(record.followUp.lastContactDate)}</span>
                  </div>
                )}
                {record.followUp?.nextFollowUpDate && (
                  <div className="flex items-center gap-1.5 text-sm text-brass-600">
                    <Clock className="w-4 h-4" />
                    <span>下次回访 {formatDate(record.followUp.nextFollowUpDate)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-sm text-ink-500">
                  <Music className="w-4 h-4 text-ink-400" />
                  <span>上次调音 {daysSinceTuning} 天前</span>
                </div>
              </div>

              <button
                onClick={() => onViewTuningHistory(record)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-clay-100 text-ink-600 text-sm font-medium hover:bg-clay-200 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                <span>查看调音历史</span>
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-clay-500" />
                <h3 className="text-lg font-semibold text-ink-500">回访记录</h3>
                <span className="bg-clay-100 text-clay-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {sortedHistory.length} 条
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-400">更新状态：</span>
                <div className="flex gap-1">
                  {FOLLOW_UP_STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium transition-all border
                        ${selectedStatus === option.value
                          ? `${option.color} ring-2 ring-offset-1`
                          : 'bg-white text-ink-500 border-clay-200 hover:bg-clay-50'}
                      `}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brass-500 text-white hover:bg-brass-600 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddForm ? '取消' : '添加回访记录'}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleSubmit} className="bg-brass-50 rounded-xl p-5 mb-6 border border-brass-100">
                <h4 className="text-sm font-semibold text-brass-700 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加新的回访记录
                </h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-500 mb-1.5">
                        联系日期 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.contactDate}
                        onChange={(e) => handleChange('contactDate', e.target.value)}
                        className={`input-field ${errors.contactDate ? 'border-red-300 focus:ring-red-200' : ''}`}
                      />
                      {errors.contactDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.contactDate}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-500 mb-1.5">
                        下次回访日期
                      </label>
                      <input
                        type="date"
                        value={formData.nextFollowUpDate}
                        onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
                        className="input-field"
                      />
                      <p className="text-xs text-ink-400 mt-1">可选，设置后状态自动变为"已联系"</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      客户反馈
                    </label>
                    <textarea
                      value={formData.customerFeedback}
                      onChange={(e) => handleChange('customerFeedback', e.target.value)}
                      placeholder="记录客户使用反馈、音准情况、是否有问题等..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      处理备注
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange('notes', e.target.value)}
                      placeholder="记录处理意见、后续安排、需要注意的事项等..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="btn-secondary"
                    >
                      取消
                    </button>
                    <button type="submit" className="btn-primary">
                      保存回访记录
                    </button>
                  </div>
                </div>
              </form>
            )}

            {sortedHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-clay-400" />
                </div>
                <h4 className="text-lg font-medium text-ink-500 mb-2">暂无回访记录</h4>
                <p className="text-ink-400 text-sm mb-4">点击上方"添加回访记录"按钮开始第一次回访</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brass-500 text-white hover:bg-brass-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>添加回访记录</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-clay-200" />
                
                {sortedHistory.map((followUp, index) => {
                  return (
                    <div key={followUp.id} className="relative pl-16 pb-8 last:pb-0">
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-4 ${
                        index === 0 
                          ? 'bg-brass-500 border-brass-200' 
                          : 'bg-white border-clay-300'
                      }`}>
                        {index === 0 && (
                          <Phone className="w-3 h-3 text-white -translate-x-0.5 -translate-y-0.5" />
                        )}
                      </div>
                      
                      <div className={`rounded-xl p-5 border ${
                        index === 0 
                          ? 'bg-brass-50/50 border-brass-200 shadow-sm' 
                          : 'bg-white border-clay-100'
                      }`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Calendar className="w-4 h-4 text-ink-400" />
                            <span className="font-semibold text-ink-500">
                              {formatDate(followUp.contactDate)}
                            </span>
                            {index === 0 && (
                              <span className="bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                最新
                              </span>
                            )}
                            {followUp.nextFollowUpDate && (
                              <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                <Clock className="w-3 h-3" />
                                下次回访 {formatDate(followUp.nextFollowUpDate)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(followUp.id)}
                            className="p-1.5 rounded-lg text-ink-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="删除记录"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {followUp.customerFeedback && (
                          <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 mb-3">
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1.5">
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span className="font-medium">客户反馈</span>
                            </div>
                            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                              {followUp.customerFeedback}
                            </p>
                          </div>
                        )}

                        {followUp.notes && (
                          <div className="bg-clay-50 rounded-lg p-3 border border-clay-100">
                            <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-medium">处理备注</span>
                            </div>
                            <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-wrap">
                              {followUp.notes}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-ink-300 mt-3">
                          记录于 {formatDateTime(followUp.createdAt)}
                        </p>
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
