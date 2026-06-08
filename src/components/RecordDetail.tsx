import { useState, useEffect } from 'react';
import { X, Plus, Calendar, FileText, ArrowRight, Music, Hash, User, Tag, Clock, CheckCircle2, AlertCircle, Activity, Target, MessageSquare } from 'lucide-react';
import type { HandpanRecord, TuningRecord, PhonemeDeviation } from '@/types/record';
import { compareTuningRecords, getStatusLabel, getStatusColor, getLatestTuning, getPhonemeNames, createEmptyPhonemeDeviations, getMaxDeviation, getCalibratedCount, getFollowUpStatus, getFollowUpStatusLabel, getFollowUpStatusColor, getNextFollowUpDate, getLastContactDate } from '@/types/record';
import { PhonemeDeviationTable } from '@/components/PhonemeDeviationTable';

interface RecordDetailProps {
  isOpen: boolean;
  onClose: () => void;
  record: HandpanRecord | null;
  onAddTuning: (recordId: string, tuning: Omit<TuningRecord, 'id' | 'createdAt'>) => void;
  onViewFollowUp: (record: HandpanRecord) => void;
}

interface TuningFormData {
  date: string;
  deviationNote: string;
  beforeStatus: string;
  afterStatus: string;
  remark: string;
  phonemeDeviations?: PhonemeDeviation[];
}

export function RecordDetail({ isOpen, onClose, record, onAddTuning, onViewFollowUp }: RecordDetailProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<TuningFormData>({
    date: new Date().toISOString().split('T')[0],
    deviationNote: '',
    beforeStatus: '',
    afterStatus: '',
    remark: '',
    phonemeDeviations: [],
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (isOpen && record) {
      const latestTuning = getLatestTuning(record);
      const phonemeNames = getPhonemeNames(record, record.noteCount);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        deviationNote: '',
        beforeStatus: latestTuning?.afterStatus || '',
        afterStatus: '',
        remark: '',
        phonemeDeviations: createEmptyPhonemeDeviations(phonemeNames),
      });
      setShowAddForm(false);
      setErrors({});
    }
  }, [isOpen, record]);

  const formatDate = (dateStr: string) => {
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
    
    if (!formData.date.trim()) {
      newErrors.date = '请选择调音日期';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate() || !record) return;

    onAddTuning(record.id, {
      date: formData.date,
      deviationNote: formData.deviationNote,
      beforeStatus: formData.beforeStatus,
      afterStatus: formData.afterStatus,
      remark: formData.remark,
      phonemeDeviations: formData.phonemeDeviations,
    });

    const phonemeNames = getPhonemeNames(record, record.noteCount);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      deviationNote: '',
      beforeStatus: formData.afterStatus,
      afterStatus: '',
      remark: '',
      phonemeDeviations: createEmptyPhonemeDeviations(phonemeNames),
    });
    setShowAddForm(false);
    setErrors({});
  };

  const handleChange = (field: keyof TuningFormData, value: string | PhonemeDeviation[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhonemeNamesChange = (names: string[]) => {
    if (!formData.phonemeDeviations) return;
    const newDeviations = formData.phonemeDeviations.map((d, i) => ({
      ...d,
      name: names[i] || d.name,
    }));
    handleChange('phonemeDeviations', newDeviations);
  };

  const sortedHistory = record?.tuningHistory
    ? [...record.tuningHistory].sort((a, b) => compareTuningRecords(b, a))
    : [];

  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="bg-white rounded-2xl shadow-2xl border border-clay-100 paper-texture">
          <div className="flex items-center justify-between p-6 border-b border-clay-100 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-clay-100 flex items-center justify-center">
                <Music className="w-5 h-5 text-clay-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-ink-500">调音历史</h2>
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
                  <p className="text-xs text-ink-400">状态</p>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(record.deliveryStatus)}`}>
                    {getStatusLabel(record.deliveryStatus)}
                  </span>
                </div>
              </div>
            </div>

            {record.deliveryStatus === 'delivered' && (
              <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-clay-200/50">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-ink-400" />
                    <div>
                      <p className="text-xs text-ink-400">回访状态</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getFollowUpStatusColor(getFollowUpStatus(record))}`}>
                        {getFollowUpStatusLabel(getFollowUpStatus(record))}
                      </span>
                    </div>
                  </div>
                  {getLastContactDate(record) && (
                    <div className="flex items-center gap-1.5 text-sm text-ink-500">
                      <Calendar className="w-4 h-4 text-ink-400" />
                      <span>上次联系 {new Date(getLastContactDate(record)!).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                  {getNextFollowUpDate(record) && (
                    <div className="flex items-center gap-1.5 text-sm text-brass-600">
                      <Clock className="w-4 h-4" />
                      <span>下次回访 {new Date(getNextFollowUpDate(record)!).toLocaleDateString('zh-CN')}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onViewFollowUp(record)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass-500 text-white text-sm font-medium hover:bg-brass-600 transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>回访详情</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-clay-500" />
                <h3 className="text-lg font-semibold text-ink-500">调音记录</h3>
                <span className="bg-clay-100 text-clay-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {sortedHistory.length} 次
                </span>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brass-500 text-white hover:bg-brass-600 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddForm ? '取消' : '新增调音'}</span>
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleSubmit} className="bg-brass-50 rounded-xl p-5 mb-6 border border-brass-100">
                <h4 className="text-sm font-semibold text-brass-700 mb-4 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  添加新的调音记录
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      调音日期 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      className={`input-field ${errors.date ? 'border-red-300 focus:ring-red-200' : ''}`}
                    />
                    {errors.date && (
                      <p className="text-red-500 text-xs mt-1">{errors.date}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-ink-500 mb-1.5">
                        调音前状态
                      </label>
                      <textarea
                        value={formData.beforeStatus}
                        onChange={(e) => handleChange('beforeStatus', e.target.value)}
                        placeholder="描述调音前的音准、音色状态..."
                        rows={3}
                        className="input-field resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink-500 mb-1.5">
                        调音后状态
                      </label>
                      <textarea
                        value={formData.afterStatus}
                        onChange={(e) => handleChange('afterStatus', e.target.value)}
                        placeholder="描述调音后的音准、音色状态..."
                        rows={3}
                        className="input-field resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      音位偏差记录
                    </label>
                    <div className="bg-white rounded-lg border border-clay-200 p-3">
                      <PhonemeDeviationTable
                        mode="edit"
                        deviations={formData.phonemeDeviations || []}
                        onChange={(deviations) => handleChange('phonemeDeviations', deviations)}
                        noteCount={record.noteCount}
                        defaultNames={getPhonemeNames(record, record.noteCount)}
                        onNamesChange={handlePhonemeNamesChange}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      偏音说明
                    </label>
                    <textarea
                      value={formData.deviationNote}
                      onChange={(e) => handleChange('deviationNote', e.target.value)}
                      placeholder="记录偏音情况、校准说明、调整的音位等..."
                      rows={3}
                      className="input-field resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-500 mb-1.5">
                      备注
                    </label>
                    <textarea
                      value={formData.remark}
                      onChange={(e) => handleChange('remark', e.target.value)}
                      placeholder="其他需要记录的信息..."
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
                      保存调音记录
                    </button>
                  </div>
                </div>
              </form>
            )}

            {sortedHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-clay-100 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-clay-400" />
                </div>
                <h4 className="text-lg font-medium text-ink-500 mb-2">暂无调音记录</h4>
                <p className="text-ink-400 text-sm mb-4">点击上方"新增调音"按钮添加第一条记录</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brass-500 text-white hover:bg-brass-600 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增调音</span>
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-clay-200" />
                
                {sortedHistory.map((tuning, index) => {
                  const maxDeviation = getMaxDeviation(tuning);
                  const calibratedCount = getCalibratedCount(tuning);
                  const hasDeviationData = maxDeviation !== null || calibratedCount > 0;

                  return (
                    <div key={tuning.id} className="relative pl-16 pb-8 last:pb-0">
                      <div className={`absolute left-4 w-5 h-5 rounded-full border-4 ${
                        index === 0 
                          ? 'bg-brass-500 border-brass-200' 
                          : 'bg-white border-clay-300'
                      }`}>
                        {index === 0 && (
                          <CheckCircle2 className="w-3 h-3 text-white -translate-x-0.5 -translate-y-0.5" />
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
                              {formatDate(tuning.date)}
                            </span>
                            {index === 0 && (
                              <span className="bg-brass-100 text-brass-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                最新
                              </span>
                            )}
                            {hasDeviationData && (
                              <>
                                <span className="flex items-center gap-1 bg-clay-100 text-ink-500 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <Activity className="w-3 h-3" />
                                  最大偏差 {maxDeviation?.toFixed(1)} 音分
                                </span>
                                <span className="flex items-center gap-1 bg-clay-100 text-ink-500 px-2 py-0.5 rounded-full text-xs font-medium">
                                  <Target className="w-3 h-3" />
                                  已校准 {calibratedCount} 个音位
                                </span>
                              </>
                            )}
                          </div>
                          {tuning.remark && (
                            <span className="text-xs text-ink-400 bg-clay-100 px-2 py-0.5 rounded">
                              {tuning.remark}
                            </span>
                          )}
                        </div>

                        {tuning.beforeStatus && tuning.afterStatus ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                              <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span className="font-medium">调音前</span>
                              </div>
                              <p className="text-sm text-amber-800 leading-relaxed">
                                {tuning.beforeStatus}
                              </p>
                            </div>
                            <div className="relative">
                              <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 z-10">
                                <ArrowRight className="w-5 h-5 text-clay-300 bg-white rounded-full" />
                              </div>
                              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="font-medium">调音后</span>
                                </div>
                                <p className="text-sm text-green-800 leading-relaxed">
                                  {tuning.afterStatus}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            {tuning.beforeStatus && (
                              <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 mb-3">
                                <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1.5">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="font-medium">调音前</span>
                                </div>
                                <p className="text-sm text-amber-800 leading-relaxed">
                                  {tuning.beforeStatus}
                                </p>
                              </div>
                            )}
                            {tuning.afterStatus && (
                              <div className="bg-green-50 rounded-lg p-3 border border-green-100 mb-3">
                                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1.5">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="font-medium">调音后</span>
                                </div>
                                <p className="text-sm text-green-800 leading-relaxed">
                                  {tuning.afterStatus}
                                </p>
                              </div>
                            )}
                          </>
                        )}

                        {tuning.phonemeDeviations && tuning.phonemeDeviations.length > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-2">
                              <Activity className="w-3.5 h-3.5" />
                              <span className="font-medium">音位偏差记录</span>
                            </div>
                            <div className="bg-white rounded-lg border border-clay-200 p-3">
                              <PhonemeDeviationTable
                                mode="view"
                                deviations={tuning.phonemeDeviations}
                                noteCount={tuning.phonemeDeviations.length}
                              />
                            </div>
                          </div>
                        )}

                        {tuning.deviationNote && (
                          <div className="bg-clay-50 rounded-lg p-3 border border-clay-100">
                            <div className="flex items-center gap-1.5 text-xs text-ink-400 mb-1.5">
                              <FileText className="w-3.5 h-3.5" />
                              <span className="font-medium">偏音说明</span>
                            </div>
                            <p className="text-sm text-ink-600 leading-relaxed">
                              {tuning.deviationNote}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-ink-300 mt-3">
                          记录于 {formatDateTime(tuning.createdAt)}
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
