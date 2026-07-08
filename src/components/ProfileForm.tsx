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
  const [trackSpecialization, setTrackSpecialization] = React.useState('');
  const [plannedDate, setPlannedDate] = React.useState(currentDate);
  const [enterprise, setEnterprise] = React.useState('');
  const [status, setStatus] = React.useState<ProfileStatus>('planned');
  const [category, setCategory] = React.useState<'survey' | 'alignment'>('survey');
  
  // Даты вех
  const [actualShotDate, setActualShotDate] = React.useState('');
  const [actualAlignmentDate, setActualAlignmentDate] = React.useState('');
  const [approvalDate, setApprovalDate] = React.useState('');
  const [traUpdateDate, setTraUpdateDate] = React.useState('');
  
  // Дополнительные поля для обеих категорий
  const [workVolume, setWorkVolume] = React.useState<string>('');
  const [completedVolume, setCompletedVolume] = React.useState<string>('');
  const [alignmentGoal, setAlignmentGoal] = React.useState('');
  const [slopeBeforeAfter, setSlopeBeforeAfter] = React.useState('');
  const [tbBeforeAfter, setTbBeforeAfter] = React.useState('');
  const [prevSurveyDate, setPrevSurveyDate] = React.useState('');

  const [traDocNumber, setTraDocNumber] = React.useState('');
  const [executorName, setExecutorName] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // Инициализация при редактировании
  React.useEffect(() => {
    if (profile) {
      setStation(profile.station || '');
      setTrackNumber(profile.trackNumber || '');
      setTrackType(profile.trackType || 'main');
      setTrackSpecialization(profile.trackSpecialization || '');
      setPlannedDate(profile.plannedDate || currentDate);
      setEnterprise(profile.enterprise || '');
      setStatus(profile.status || 'planned');
      setCategory(profile.category || 'survey');
      setActualShotDate(profile.actualShotDate || '');
      setActualAlignmentDate(profile.actualAlignmentDate || '');
      setWorkVolume(profile.workVolume !== undefined ? String(profile.workVolume) : '');
      setCompletedVolume(profile.completedVolume !== undefined ? String(profile.completedVolume) : '');
      setAlignmentGoal(profile.alignmentGoal || '');
      setSlopeBeforeAfter(profile.slopeBeforeAfter || '');
      setTbBeforeAfter(profile.tbBeforeAfter || '');
      setPrevSurveyDate(profile.prevSurveyDate || '');
      setApprovalDate(profile.approvalDate || '');
      // If traUpdateDate is not explicitly present, use profileCheckDsDate or actual date
      setTraUpdateDate(profile.traUpdateDate || '');
      setTraDocNumber(profile.traDocNumber || '');
      setExecutorName(profile.executorName || '');
      setNotes(profile.notes || '');
    } else {
      // Значения по умолчанию для новой записи
      setStation('');
      setTrackNumber('');
      setTrackType('main');
      setTrackSpecialization('');
      setPlannedDate(currentDate);
      setEnterprise('ПЧ-10 Слюдянская дистанция пути');
      setStatus('planned');
      setCategory('survey');
      setActualShotDate('');
      setActualAlignmentDate('');
      setWorkVolume('');
      setCompletedVolume('');
      setAlignmentGoal('');
      setSlopeBeforeAfter('');
      setTbBeforeAfter('');
      setPrevSurveyDate('');
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
    if (newStatus === 'shot') {
      if (category === 'alignment' && !actualAlignmentDate) {
        setActualAlignmentDate(currentDate);
      } else if (category === 'survey' && !actualShotDate) {
        setActualShotDate(currentDate);
      }
    }
    // Если в статус утвержден - подставим дату утверждения по умолчанию
    if (newStatus === 'approved') {
      if (category === 'alignment') {
        if (!actualAlignmentDate) setActualAlignmentDate(currentDate);
      } else {
        if (!actualShotDate) setActualShotDate(currentDate);
      }
      if (!approvalDate) setApprovalDate(currentDate);
    }
    // Если в статус изменений ТРА - подставим все даты
    if (newStatus === 'tra_updated') {
      if (category === 'alignment') {
        if (!actualAlignmentDate) setActualAlignmentDate(currentDate);
      } else {
        if (!actualShotDate) setActualShotDate(currentDate);
      }
      if (!approvalDate) setApprovalDate(currentDate);
      if (!traUpdateDate) setTraUpdateDate(currentDate);
    }

    // Очистка дат, если статус откатывается назад
    if (newStatus === 'planned') {
      setActualShotDate('');
      setActualAlignmentDate('');
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
      category,
      station: station.trim(),
      trackNumber: trackNumber.trim(),
      trackType,
      trackSpecialization: trackSpecialization.trim() || undefined,
      plannedDate,
      enterprise,
      status,
      workVolume: workVolume ? parseFloat(workVolume) : undefined,
      completedVolume: completedVolume ? parseFloat(completedVolume) : undefined,
      alignmentGoal: category === 'alignment' && alignmentGoal.trim() ? alignmentGoal.trim() : undefined,
      slopeBeforeAfter: category === 'alignment' && slopeBeforeAfter.trim() ? slopeBeforeAfter.trim() : undefined,
      tbBeforeAfter: category === 'alignment' && tbBeforeAfter.trim() ? tbBeforeAfter.trim() : undefined,
      prevSurveyDate: category === 'survey' && prevSurveyDate ? prevSurveyDate : undefined,
      
      // Включаем только заполненные даты
      actualShotDate: status !== 'planned' && category === 'survey' && actualShotDate ? actualShotDate : undefined,
      actualAlignmentDate: status !== 'planned' && category === 'alignment' && actualAlignmentDate ? actualAlignmentDate : undefined,
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
    "ПМС-45 Путевая машинная станция",
    "ПМС-26 Иркутск"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Заголовок формы */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div>
            <h3 className="font-extrabold text-slate-800 text-lg">
              {isEditing ? 'Редактирование карточки профиля' : 'Добавление пути в программу контроля'}
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
          
          {/* Переключатель категории (Съемка или Выправка) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Категория контроля</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCategory('survey')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  category === 'survey' 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Съемка продольного профиля
              </button>
              <button
                type="button"
                onClick={() => setCategory('alignment')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  category === 'alignment' 
                    ? 'bg-white text-amber-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Выправка железнодорожного пути
              </button>
            </div>
          </div>

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
                placeholder="Например: Главный № II, Путь № 5"
                value={trackNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  setTrackNumber(val);
                  const low = val.toLowerCase();
                  if (low.includes('главн') || low.includes('main') || ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4'].includes(low.trim())) {
                    setTrackType('main');
                    if (!trackSpecialization) setTrackSpecialization('Главный');
                  } else if (low.includes('сортир') && low.includes('отправ')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Сортировочно-отправочный');
                  } else if (low.includes('выставоч')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Выставочный');
                  } else if (low.includes('соединит')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Соединительный');
                  } else if (low.includes('весов')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Весовой');
                  } else if (low.includes('ходов')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Ходовой');
                  } else if (low.includes('сортир')) {
                    setTrackType('special');
                    if (!trackSpecialization) setTrackSpecialization('Сортировочный');
                  } else if (low.includes('прием') || low.includes('отправ') || low.includes('станц') || low.includes('station')) {
                    setTrackType('station');
                    if (!trackSpecialization) setTrackSpecialization('Приемо-отправочный');
                  }
                }}
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
                    onClick={() => {
                      setTrackType(t);
                      if (t === 'main') setTrackSpecialization('Главный');
                      else if (t === 'station') setTrackSpecialization('Приемо-отправочный');
                      else if (t === 'special' && !['Сортировочно-отправочный', 'Выставочный', 'Соединительный', 'Весовой', 'Ходовой'].includes(trackSpecialization)) {
                        setTrackSpecialization('Прочий');
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      trackType === t 
                        ? 'bg-blue-50 text-blue-600 border-blue-500 shadow-xs' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'main' ? 'Главный' : t === 'station' ? 'Приемо-отправочный' : 'Прочий'}
                  </button>
                ))}
              </div>
            </div>

            {/* Специализация пути */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Специализация пути (точно как в ТРА/Excel)
              </label>
              <input 
                type="text" 
                placeholder="Например: Сортировочно-отправочный, Выставочный, Приемо-отправочный"
                value={trackSpecialization}
                onChange={(e) => setTrackSpecialization(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-semibold text-slate-800"
                list="specializations-list"
              />
              <datalist id="specializations-list">
                <option value="Главный" />
                <option value="Приемо-отправочный" />
                <option value="Сортировочно-отправочный" />
                <option value="Выставочный" />
                <option value="Соединительный" />
                <option value="Весовой" />
                <option value="Ходовой" />
                <option value="Сортировочный" />
                <option value="Прочий" />
              </datalist>
            </div>

            {/* Планируемая дата */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                {category === 'alignment' ? 'Планируемая дата выправки' : 'Планируемая дата съемки'} <span className="text-red-500">*</span>
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
              <label className="text-xs font-bold text-slate-500">
                {category === 'alignment' ? 'Предприятие, выполняющее выправку (ПЧ/ПМС)' : 'Предприятие, осуществляющее съемку'}
              </label>
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

          {/* Категория-специфичные поля (Съемка или Выправка) */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {category === 'alignment' ? 'Параметры выправки пути' : 'Параметры съемки профиля'}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Общие для обеих категорий поля объема */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">Объем работ по плану (км)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Например: 1.25"
                  value={workVolume}
                  onChange={(e) => setWorkVolume(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                />
              </div>

              {category === 'alignment' ? (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Выполненный объем работ (км)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="Например: 1.10"
                      value={completedVolume}
                      onChange={(e) => setCompletedVolume(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Цель выправки</label>
                    <input 
                      type="text" 
                      placeholder="Например: Устранение просадок"
                      value={alignmentGoal}
                      onChange={(e) => setAlignmentGoal(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Приведенный уклон до/после (‰)</label>
                    <input 
                      type="text" 
                      placeholder="Например: 4.2 / 3.8"
                      value={slopeBeforeAfter}
                      onChange={(e) => setSlopeBeforeAfter(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Количество т/б до/после выправки</label>
                    <input 
                      type="text" 
                      placeholder="Например: 120 / 80"
                      value={tbBeforeAfter}
                      onChange={(e) => setTbBeforeAfter(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Дата предыдущей съемки</label>
                    <input 
                      type="date" 
                      value={prevSurveyDate}
                      onChange={(e) => setPrevSurveyDate(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-800"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Секция жизненного цикла работы и ТРА */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Жизненный цикл и изменения в ТРА</h4>
            
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
                      {st === 'shot' && (category === 'alignment' ? 'Выправлено' : 'Съемка выполнена')}
                      {st === 'approved' && 'Утверждено'}
                      {st === 'tra_updated' && 'ТРА обновлен'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Поля дат в зависимости от статуса */}
            {status !== 'planned' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
                
                {/* Дата съемки / выправки */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    {category === 'alignment' ? 'Дата выправки (факт)' : 'Дата съемки (факт)'}
                  </label>
                  {category === 'alignment' ? (
                    <input 
                      type="date" 
                      value={actualAlignmentDate}
                      onChange={(e) => setActualAlignmentDate(e.target.value)}
                      required={true}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                    />
                  ) : (
                    <input 
                      type="date" 
                      value={actualShotDate}
                      onChange={(e) => setActualShotDate(e.target.value)}
                      required={true}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs font-semibold focus:outline-none"
                    />
                  )}
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
                placeholder="ФИО инженера / дорожного мастера"
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
                placeholder="Укажите особые условия работы, примененную технику, причины переноса сроков или реквизиты согласований..."
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
