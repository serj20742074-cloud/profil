import React from 'react';
import { X, Save, AlertTriangle, Calendar, MapPin, User, FileText, CheckCircle2 } from 'lucide-react';
import { TrackProfile, ProfileStatus } from '../types';

interface ProfileFormProps {
  profile: TrackProfile | null; // Если null, значит создание новой записи
  onSave: (profile: TrackProfile) => void;
  onClose: () => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, onSave, onClose }) => {
  const isEditing = !!profile;
  const currentDate = '2026-07-03';

  // Состояние формы
  const [station, setStation] = React.useState('');
  const [trackNumber, setTrackNumber] = React.useState('');
  const [trackType, setTrackType] = React.useState<'main' | 'station' | 'special'>('main');
  const [plannedDate, setPlannedDate] = React.useState(currentDate);
  const [enterprise, setEnterprise] = React.useState('');
  const [status, setStatus] = React.useState<ProfileStatus>('planned');
  
  // Даты вех
  const [actualShotDate, setActualShotDate] = React.useState('');
  const [approvalDate, setApprovalDate] = React.useState('');
  const [traUpdateDate, setTraUpdateDate] = React.useState('');
  
  const [traDocNumber, setTraDocNumber] = React.useState('');
  const [executorName, setExecutorName] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Инициализация при редактировании
  React.useEffect(() => {
    if (profile) {
      setStation(profile.station || '');
      setTrackNumber(profile.trackNumber || '');
      setTrackType(profile.trackType || 'main');
      setPlannedDate(profile.plannedDate || currentDate);
      setEnterprise(profile.enterprise || '');
      setStatus(profile.status || 'planned');
      setActualShotDate(profile.actualShotDate || '');
      setApprovalDate(profile.approvalDate || '');
      setTraUpdateDate(profile.traUpdateDate || '');
      setTraDocNumber(profile.traDocNumber || '');
      setExecutorName(profile.executorName || '');
      setNotes(profile.notes || '');
    } else {
      // Значения по умолчанию для новой записи
      setStation('');
      setTrackNumber('');
      setTrackType('main');
      setPlannedDate(currentDate);
      setEnterprise('ПЧ-10 Слюдянская дистанция пути');
      setStatus('planned');
      setActualShotDate('');
      setApprovalDate('');
      setTraUpdateDate('');
      setTraDocNumber('');
      setExecutorName('');
      setNotes('');
    }
  }, [profile]);

  // Автоматическая корректировка дат при смене статуса
  const handleStatusChange = (newStatus: ProfileStatus) => {
    setStatus(newStatus);
    
    // Если переводим в статус съемки - подставим дату съемки по умолчанию
    if (newStatus === 'shot' && !actualShotDate) {
      setActualShotDate(currentDate);
    }
    // Если в статус утвержден - подставим дату утверждения по умолчанию
    if (newStatus === 'approved') {
      if (!actualShotDate) setActualShotDate(currentDate);
      if (!approvalDate) setApprovalDate(currentDate);
    }
    // Если в статус изменений ТРА - подставим все даты
    if (newStatus === 'tra_updated') {
      if (!actualShotDate) setActualShotDate(currentDate);
      if (!approvalDate) setApprovalDate(currentDate);
      if (!traUpdateDate) setTraUpdateDate(currentDate);
    }

    // Очистка дат, если статус откатывается назад
    if (newStatus === 'planned') {
      setActualShotDate('');
      setApprovalDate('');
      setTraUpdateDate('');
      setTraDocNumber('');
    } else if (newStatus === 'shot') {
      setApprovalDate('');
      setTraUpdateDate('');
      setTraDocNumber('');
    } else if (newStatus === 'approved') {
      setTraUpdateDate('');
      setTraDocNumber('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!station.trim()) {
      alert('Укажите название станции!');
      return;
    }
    if (!trackNumber.trim()) {
      alert('Укажите номер или название пути!');
      return;
    }

    const savedProfile: TrackProfile = {
      id: profile ? profile.id : `prof-${Date.now()}`,
      station: station.trim(),
      trackNumber: trackNumber.trim(),
      trackType,
      plannedDate,
      enterprise,
      status,
      // Включаем только заполненные даты
      actualShotDate: status !== 'planned' && actualShotDate ? actualShotDate : undefined,
      approvalDate: (status === 'approved' || status === 'tra_updated') && approvalDate ? approvalDate : undefined,
      traUpdateDate: status === 'tra_updated' && traUpdateDate ? traUpdateDate : undefined,
      traDocNumber: status === 'tra_updated' && traDocNumber.trim() ? traDocNumber.trim() : undefined,
      executorName: executorName.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: profile ? profile.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(savedProfile);
  };

  const sampleStations = [
    "Слюдянка-1", "Иркутск-Пассажирский", "Ангарск", "Зима", "Черемхово", 
    "Тайшет", "Култук", "Маритуй", "Байкал", "Порт Байкал", "Большой Луг", "Шелехов"
  ];

  const sampleEnterprises = [
    "ПЧ-10 Слюдянская дистанция пути",
    "ПЧ-13 Иркутск-Пассажирская дистанция",
    "ПЧ-15 Черемховская дистанция пути",
    "ПС-26 Проектно-изыскательская партия",
    "ПМС-224 Путевая машинная станция",
    "ПМС-45 Путевая машинная станция"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Заголовок формы */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">
              {isEditing ? 'Редактирование карточки профиля' : 'Добавление пути в программу съемки'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Заполните сведения о станции, планируемых сроках и фактических этапах
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Станция */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                Станция / Остановочный пункт <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                list="stations-list"
                placeholder="Введите название станции"
                value={station}
                onChange={(e) => setStation(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
              />
              <datalist id="stations-list">
                {sampleStations.map((st, i) => <option key={i} value={st} />)}
              </datalist>
            </div>

            {/* Номер пути */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Номер или название пути <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Например: Главный № I, Сортировочный № 5"
                value={trackNumber}
                onChange={(e) => setTrackNumber(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
              />
            </div>

            {/* Тип пути */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Категория (тип) пути</label>
              <div className="grid grid-cols-3 gap-2">
                {(['main', 'station', 'special'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrackType(t)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      trackType === t 
                        ? 'bg-blue-50 text-blue-600 border-blue-500 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'main' ? 'Главный' : t === 'station' ? 'Станционный' : 'Прочий'}
                  </button>
                ))}
              </div>
            </div>

            {/* Планируемая дата съемки */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                Планируемая дата съемки <span className="text-red-500">*</span>
              </label>
              <input 
                type="date" 
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              />
            </div>

            {/* Предприятие исполнитель */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500">Предприятие, осуществляющее съемку</label>
              <input 
                type="text" 
                list="enterprises-list"
                placeholder="Выберите или введите название подразделения"
                value={enterprise}
                onChange={(e) => setEnterprise(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800"
              />
              <datalist id="enterprises-list">
                {sampleEnterprises.map((ent, i) => <option key={i} value={ent} />)}
              </datalist>
            </div>

          </div>

          {/* Секция жизненного цикла работы и ТРА */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Жизненный цикл профиля и изменения в ТРА</h4>
            
            {/* Переключатель статуса */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 block">Текущий этап выполнения работ</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(['planned', 'shot', 'approved', 'tra_updated'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      status === st 
                        ? st === 'planned' ? 'bg-slate-50 text-slate-700 border-slate-500'
                          : st === 'shot' ? 'bg-blue-50 text-blue-700 border-blue-500'
                          : st === 'approved' ? 'bg-amber-50 text-amber-700 border-amber-500'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-500'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider">
                      {st === 'planned' && 'Шаг 1'}
                      {st === 'shot' && 'Шаг 2'}
                      {st === 'approved' && 'Шаг 3'}
                      {st === 'tra_updated' && 'Шаг 4'}
                    </span>
                    <span className="text-xs font-extrabold">
                      {st === 'planned' && 'В плане'}
                      {st === 'shot' && 'Съемка выполнена'}
                      {st === 'approved' && 'Утвержден'}
                      {st === 'tra_updated' && 'ТРА обновлен'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Поля дат в зависимости от статуса */}
            {status !== 'planned' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                
                {/* Дата съемки */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Фактическая дата съемки</label>
                  <input 
                    type="date" 
                    value={actualShotDate}
                    onChange={(e) => setActualShotDate(e.target.value)}
                    required={status !== 'planned'}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Дата утверждения */}
                {(status === 'approved' || status === 'tra_updated') && (
                  <div className="space-y-1 animate-in fade-in duration-100">
                    <label className="text-xs font-bold text-slate-500">Дата утверждения</label>
                    <input 
                      type="date" 
                      value={approvalDate}
                      onChange={(e) => setApprovalDate(e.target.value)}
                      required={status === 'approved' || status === 'tra_updated'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                )}

                {/* Дата ТРА */}
                {status === 'tra_updated' && (
                  <div className="space-y-1 animate-in fade-in duration-100">
                    <label className="text-xs font-bold text-slate-500">Дата изменений ТРА</label>
                    <input 
                      type="date" 
                      value={traUpdateDate}
                      onChange={(e) => setTraUpdateDate(e.target.value)}
                      required={status === 'tra_updated'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                )}

                {/* Документ ТРА */}
                {status === 'tra_updated' && (
                  <div className="space-y-1 md:col-span-3 animate-in fade-in duration-100">
                    <label className="text-xs font-bold text-slate-500">№ Акта/Распоряжения ТРА</label>
                    <input 
                      type="text" 
                      placeholder="Например: № НЗ-14/ТРА"
                      value={traDocNumber}
                      onChange={(e) => setTraDocNumber(e.target.value)}
                      required={status === 'tra_updated'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-semibold focus:outline-none text-slate-800"
                    />
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Исполнитель и Примечания */}
          <div className="border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Ответственный исполнитель */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Ответственный исполнитель (ФИО)
              </label>
              <input 
                type="text" 
                placeholder="ФИО инженера / руководителя партии"
                value={executorName}
                onChange={(e) => setExecutorName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800"
              />
            </div>

            {/* Примечания */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-bold text-slate-500">Примечания / Замечания по объекту</label>
              <textarea 
                rows={3}
                placeholder="Укажите особые условия съемки, причины переноса сроков или реквизиты согласований..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-800"
              ></textarea>
            </div>

          </div>

          {/* Кнопки действий */}
          <div className="p-4 -mx-6 -mb-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-sm font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Отмена
            </button>
            <button 
              type="submit"
              className="px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-2 transition-all shadow-sm shadow-blue-100 cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              <span>Сохранить изменения</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
