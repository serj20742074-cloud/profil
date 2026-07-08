import React from 'react';
import { 
  FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, ShieldAlert,
  Search, FileCheck, Check, Calendar, Info, X
} from 'lucide-react';
import { TrackProfile, ProfileStatus } from '../types';
import { formatDate } from '../utils';

interface TraChangeManagerProps {
  profiles: TrackProfile[];
  onQuickStatusChange: (profileId: string, nextStatus: ProfileStatus, dates: { [key: string]: string; doc?: string }) => void;
  onSelectProfile: (profileId: string) => void;
}

export const TraChangeManager: React.FC<TraChangeManagerProps> = ({
  profiles,
  onQuickStatusChange,
  onSelectProfile
}) => {
  const currentDate = '2026-07-03';
  const [search, setSearch] = React.useState('');

  // 1. Фильтруем только те профили, которые либо утверждены, либо изменения в ТРА уже внесены
  const traProfiles = React.useMemo(() => {
    return profiles.filter(p => p.status === 'approved' || p.status === 'tra_updated');
  }, [profiles]);

  // 2. Дополнительная фильтрация по поисковой строке
  const filteredTraProfiles = React.useMemo(() => {
    return traProfiles.filter(p => 
      p.station.toLowerCase().includes(search.toLowerCase()) ||
      p.trackNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.traDocNumber && p.traDocNumber.toLowerCase().includes(search.toLowerCase()))
    );
  }, [traProfiles, search]);

  // 3. Метрики для ТРА панели
  const metrics = React.useMemo(() => {
    let completed = 0;
    let pending = 0;
    let criticalDelay = 0; // Ожидают ТРА более 15 дней с момента утверждения профиля

    traProfiles.forEach(p => {
      if (p.status === 'tra_updated') {
        completed++;
      } else if (p.status === 'approved') {
        pending++;
        
        // Считаем дни с момента утверждения
        if (p.approvalDate) {
          const appDate = new Date(p.approvalDate);
          const cDate = new Date(currentDate);
          const diffTime = cDate.getTime() - appDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 15) {
            criticalDelay++;
          }
        }
      }
    });

    return {
      total: traProfiles.length,
      completed,
      pending,
      criticalDelay
    };
  }, [traProfiles]);

  // Модалка для закрытия вехи ТРА
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [traDate, setTraDate] = React.useState(currentDate);
  const [traDocNum, setTraDocNum] = React.useState('');

  const handleOpenTraDialog = (profileId: string) => {
    setSelectedProfileId(profileId);
    setTraDate(currentDate);
    setTraDocNum('');
  };

  const handleConfirmTraUpdate = () => {
    if (!selectedProfileId) return;
    
    onQuickStatusChange(selectedProfileId, 'tra_updated', {
      traUpdateDate: traDate,
      doc: traDocNum
    });
    setSelectedProfileId(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Пояснительный виджет по ТРА */}
      <div className="bg-slate-950 text-white p-5 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row gap-5 items-start">
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-2 flex-1">
          <h3 className="font-extrabold text-base tracking-tight text-slate-100 flex items-center gap-2">
            Важность своевременного изменения ТРА станции
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-white">Техническо-распорядительный акт (ТРА)</strong> определяет порядок безопасного приема, отправления и маневровой работы на станции. После выполнения съемки и утверждения нового продольного профиля пути, его уклоны, полезная длина и координаты путей меняются. Любые расхождения между фактическим профилем и ТРА могут привести к нарушению расчетов веса поездов и тормозных путей. Своевременное внесение изменений — залог безопасности движения!
          </p>
        </div>
      </div>

      {/* Метрики ТРА контроля */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Утвержденных профилей</span>
            <div className="text-3xl font-extrabold text-slate-800">{metrics.total}</div>
            <span className="text-xs text-slate-400">всего завершено съемок</span>
          </div>
          <div className="p-2.5 bg-slate-50 rounded-lg">
            <FileCheck className="text-blue-500 w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider block">Внесено в ТРА</span>
            <div className="text-3xl font-extrabold text-emerald-600">{metrics.completed}</div>
            <span className="text-xs text-slate-400">изменения утверждены</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg">
            <CheckCircle2 className="text-emerald-500 w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-xs text-amber-600 font-semibold uppercase tracking-wider block">Ожидает изменения</span>
            <div className="text-3xl font-extrabold text-amber-500">{metrics.pending}</div>
            <span className="text-xs text-slate-400">бумажная работа в процессе</span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg">
            <Clock className="text-amber-500 w-5 h-5" />
          </div>
        </div>

        <div className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between ${
          metrics.criticalDelay > 0 ? 'bg-red-50/50 border-red-100 animate-pulse' : 'bg-white border-slate-100'
        }`}>
          <div className="space-y-2">
            <span className="text-xs text-red-600 font-bold uppercase tracking-wider block">Превышен лимит ТРА (15 дн.)</span>
            <div className="text-3xl font-extrabold text-red-600">{metrics.criticalDelay}</div>
            <span className="text-xs text-slate-400">риски несоответствия актов</span>
          </div>
          <div className="p-2.5 bg-red-100/50 rounded-lg">
            <ShieldAlert className="text-red-600 w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Поиск и список задач ТРА */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-col md:flex-row gap-3">
          <h3 className="font-extrabold text-slate-800 text-base">Реестр изменений ТРА по утвержденным профилям</h3>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по станции или номеру акта..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Сетка карточек контроля изменений ТРА - оптимизирована под планшеты */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTraProfiles.length === 0 ? (
            <div className="col-span-2 text-center py-10 border border-dashed rounded-xl border-slate-200 text-slate-400">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm">Нет утвержденных профилей для отображения ТРА-статуса</p>
              <p className="text-xs">Утвердите хотя бы один отснятый профиль на вкладке "Программа съемки"</p>
            </div>
          ) : (
            filteredTraProfiles.map(p => {
              const isUpdated = p.status === 'tra_updated';
              
              // Расчет дней в ожидании
              let daysWaiting = 0;
              let isCritical = false;
              if (p.approvalDate && !isUpdated) {
                const appDate = new Date(p.approvalDate);
                const cDate = new Date(currentDate);
                const diffTime = cDate.getTime() - appDate.getTime();
                daysWaiting = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                isCritical = daysWaiting > 15;
              }

              return (
                <div 
                  key={p.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                    isUpdated 
                      ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200' 
                      : isCritical 
                        ? 'bg-red-50/30 border-red-200 hover:border-red-300' 
                        : 'bg-amber-50/20 border-amber-100 hover:border-amber-200'
                  }`}
                >
                  <div className="space-y-3.5">
                    
                    {/* Станция и статус */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 
                          onClick={() => onSelectProfile(p.id)}
                          className="font-extrabold text-slate-800 text-base hover:text-blue-600 cursor-pointer transition-all"
                        >
                          {p.station}
                        </h4>
                        <span className="text-xs text-slate-500 font-semibold">{p.trackNumber}</span>
                      </div>

                      {isUpdated ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                          <Check className="w-3 h-3" /> ТРА изменен
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          isCritical ? 'bg-red-100 text-red-800 border-red-200 animate-pulse' : 'bg-amber-100 text-amber-800 border-amber-200'
                        }`}>
                          <Clock className="w-3 h-3" /> Ожидает ТРА
                        </span>
                      )}
                    </div>

                    {/* Детали дат */}
                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100/70 py-2.5">
                      <div>
                        <span className="text-slate-400 block font-medium">Дата уверждения:</span>
                        <span className="font-bold text-slate-700 font-mono">{formatDate(p.approvalDate)}</span>
                      </div>
                      <div>
                        {isUpdated ? (
                          <>
                            <span className="text-slate-400 block font-medium">Дата изменения ТРА:</span>
                            <span className="font-bold text-emerald-700 font-mono">{formatDate(p.traUpdateDate)}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-400 block font-medium">Дней ожидания:</span>
                            <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                              {daysWaiting} дней
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Документы и Исполнитель */}
                    <div className="space-y-1 text-xs">
                      {isUpdated ? (
                        <div className="flex items-center gap-1.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 text-emerald-900 font-bold">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Акт/Приказ: {p.traDocNumber || 'Не указан'}</span>
                        </div>
                      ) : (
                        isCritical && (
                          <div className="flex items-center gap-1.5 bg-red-50 p-2 rounded-lg border border-red-100 text-red-700 font-bold">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                            <span>Критическая задержка обновления ТРА!</span>
                          </div>
                        )
                      )}
                      
                      {p.executorName && (
                        <p className="text-slate-500 pt-1">
                          <strong className="font-bold text-slate-600">Исполнитель:</strong> {p.executorName}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Кнопка действия */}
                  {!isUpdated && (
                    <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end">
                      <button
                        onClick={() => handleOpenTraDialog(p.id)}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
                      >
                        <span>Завершить изменение ТРА</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Быстрое модальное окно завершения изменений ТРА */}
      {selectedProfileId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                Регистрация изменений ТРА
              </h3>
              <button 
                onClick={() => setSelectedProfileId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Заполните реквизиты официального утверждения изменений в Техническо-распорядительном акте (ТРА) станции. Это завершит полный цикл контроля объекта.
              </p>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Дата утверждения изменений в ТРА</label>
                  <input 
                    type="date" 
                    value={traDate}
                    onChange={(e) => setTraDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">№ распоряжения или акта комиссии</label>
                  <input 
                    type="text" 
                    placeholder="Например: № НЗ-14/ТРА или № 422-р"
                    value={traDocNum}
                    onChange={(e) => setTraDocNum(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button 
                onClick={() => setSelectedProfileId(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={handleConfirmTraUpdate}
                disabled={!traDocNum.trim()}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Внести изменения
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
