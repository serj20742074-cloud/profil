import React from 'react';
import { 
  Search, Filter, Check, Clock, Play, FileCheck, CheckCircle2, 
  AlertTriangle, Calendar, Edit, Trash2, ArrowUpDown, RefreshCw, Plus, X,
  FileSpreadsheet
} from 'lucide-react';
import { TrackProfile, ProfileStatus } from '../types';
import { ExcelImporter } from './ExcelImporter';

interface ProfileTableProps {
  profiles: TrackProfile[];
  onSelectProfile: (profileId: string) => void;
  onEditProfile: (profile: TrackProfile) => void;
  onDeleteProfile: (profileId: string) => void;
  onAddProfileClick: () => void;
  onQuickStatusChange: (profileId: string, nextStatus: ProfileStatus, dates: { [key: string]: string; doc?: string }) => void;
  onImportProfiles: (newProfiles: TrackProfile[], strategy: 'append' | 'overwrite') => void;
}

export const ProfileTable: React.FC<ProfileTableProps> = ({
  profiles,
  onSelectProfile,
  onEditProfile,
  onDeleteProfile,
  onAddProfileClick,
  onQuickStatusChange,
  onImportProfiles
}) => {
  const currentDate = '2026-07-03';

  // Состояния фильтрации и поиска
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [enterpriseFilter, setEnterpriseFilter] = React.useState<string>('all');
  const [trackTypeFilter, setTrackTypeFilter] = React.useState<string>('all');
  const [monthFilter, setMonthFilter] = React.useState<string>('all');
  const [overdueFilter, setOverdueFilter] = React.useState<boolean>(false);

  // Состояние импорта Excel
  const [isExcelImportOpen, setIsExcelImportOpen] = React.useState(false);

  // Состояния быстрой смены статуса (модалка/ввод для дат)
  const [quickActionProfile, setQuickActionProfile] = React.useState<TrackProfile | null>(null);
  const [quickDateValue, setQuickDateValue] = React.useState(currentDate);
  const [quickDocValue, setQuickDocValue] = React.useState('');

  // Извлечение уникальных списков для фильтров
  const enterprises = React.useMemo(() => {
    const list = new Set<string>();
    profiles.forEach(p => p.enterprise && list.add(p.enterprise));
    return Array.from(list);
  }, [profiles]);

  const stations = React.useMemo(() => {
    const list = new Set<string>();
    profiles.forEach(p => p.station && list.add(p.station));
    return Array.from(list);
  }, [profiles]);

  // Фильтрация данных
  const filteredProfiles = React.useMemo(() => {
    return profiles.filter(p => {
      // Поиск
      const matchesSearch = 
        p.station.toLowerCase().includes(search.toLowerCase()) ||
        p.trackNumber.toLowerCase().includes(search.toLowerCase()) ||
        (p.notes && p.notes.toLowerCase().includes(search.toLowerCase())) ||
        (p.executorName && p.executorName.toLowerCase().includes(search.toLowerCase()));
      
      // Фильтр статусов
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      
      // Фильтр предприятий
      const matchesEnterprise = enterpriseFilter === 'all' || p.enterprise === enterpriseFilter;

      // Фильтр типа пути
      const matchesTrackType = trackTypeFilter === 'all' || p.trackType === trackTypeFilter;

      // Фильтр месяцев
      const pMonth = p.plannedDate.substring(5, 7);
      const matchesMonth = monthFilter === 'all' || pMonth === monthFilter;

      // Фильтр просроченных
      const isOverdue = p.status === 'planned' && p.plannedDate < currentDate;
      const matchesOverdue = !overdueFilter || isOverdue;

      return matchesSearch && matchesStatus && matchesEnterprise && matchesTrackType && matchesMonth && matchesOverdue;
    });
  }, [profiles, search, statusFilter, enterpriseFilter, trackTypeFilter, monthFilter, overdueFilter]);

  // Обработка быстрой смены статуса
  const handleOpenQuickAction = (profile: TrackProfile) => {
    setQuickActionProfile(profile);
    setQuickDateValue(currentDate);
    setQuickDocValue('');
  };

  const handleConfirmQuickAction = () => {
    if (!quickActionProfile) return;

    let nextStatus: ProfileStatus = 'planned';
    const dates: { [key: string]: string; doc?: string } = {};

    if (quickActionProfile.status === 'planned') {
      nextStatus = 'shot';
      dates.actualShotDate = quickDateValue;
    } else if (quickActionProfile.status === 'shot') {
      nextStatus = 'approved';
      dates.approvalDate = quickDateValue;
    } else if (quickActionProfile.status === 'approved') {
      nextStatus = 'tra_updated';
      dates.traUpdateDate = quickDateValue;
      if (quickDocValue) {
        dates.doc = quickDocValue;
      }
    }

    onQuickStatusChange(quickActionProfile.id, nextStatus, dates);
    setQuickActionProfile(null);
  };

  // Сброс всех фильтров
  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setEnterpriseFilter('all');
    setTrackTypeFilter('all');
    setMonthFilter('all');
    setOverdueFilter(false);
  };

  // Месяцы для фильтрации
  const months = [
    { name: 'Январь', code: '01' },
    { name: 'Февраль', code: '02' },
    { name: 'Март', code: '03' },
    { name: 'Апрель', code: '04' },
    { name: 'Май', code: '05' },
    { name: 'Июнь', code: '06' },
    { name: 'Июль', code: '07' },
    { name: 'Август', code: '08' },
    { name: 'Сентябрь', code: '09' },
    { name: 'Октябрь', code: '10' },
    { name: 'Ноябрь', code: '11' },
    { name: 'Декабрь', code: '12' },
  ];

  return (
    <div className="space-y-4">
      {/* Панель фильтров и управления */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        
        {/* Верхняя строка: Поиск и Новая запись */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по станции, пути, примечаниям или исполнителю..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsExcelImportOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              Импорт из Excel
            </button>
            <button 
              onClick={onAddProfileClick}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-100 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              Добавить путь в программу
            </button>
          </div>
        </div>

        {/* Сетка фильтров */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-slate-100 pt-4">
          
          {/* Статус */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Статус съемки</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Все статусы</option>
              <option value="planned">В плане</option>
              <option value="shot">Съемка выполнена</option>
              <option value="approved">Утверждено</option>
              <option value="tra_updated">Внесено в ТРА</option>
            </select>
          </div>

          {/* Предприятие */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Исполнитель съемки</label>
            <select 
              value={enterpriseFilter} 
              onChange={(e) => setEnterpriseFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
            >
              <option value="all">Все предприятия</option>
              {enterprises.map((ent, idx) => (
                <option key={idx} value={ent}>{ent.replace(' дистанция пути', '').replace('Путевая машинная станция', 'ПМС')}</option>
              ))}
            </select>
          </div>

          {/* Тип пути */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Категория пути</label>
            <select 
              value={trackTypeFilter} 
              onChange={(e) => setTrackTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Все категории</option>
              <option value="main">Главные пути</option>
              <option value="station">Приемо-отправочные</option>
              <option value="special">Прочие/Специальные</option>
            </select>
          </div>

          {/* Месяц планирования */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Месяц съемки (План)</label>
            <select 
              value={monthFilter} 
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Все месяцы</option>
              {months.map((m, idx) => (
                <option key={idx} value={m.code}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Чекбокс просрочки */}
          <div className="flex items-end pb-1.5 pl-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 select-none">
              <input 
                type="checkbox" 
                checked={overdueFilter} 
                onChange={(e) => setOverdueFilter(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4"
              />
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                Только просроченные
              </span>
            </label>
          </div>

        </div>

        {/* Кнопка сброса при активных фильтрах */}
        {(search || statusFilter !== 'all' || enterpriseFilter !== 'all' || trackTypeFilter !== 'all' || monthFilter !== 'all' || overdueFilter) && (
          <div className="flex justify-end pt-1">
            <button 
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Сбросить все фильтры ({filteredProfiles.length} найдено)
            </button>
          </div>
        )}
      </div>

      {/* Список программных профилей (Таблица) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-5">Станция</th>
                <th className="py-4 px-4">Путь</th>
                <th className="py-4 px-4">Исполнитель</th>
                <th className="py-4 px-4">Плановая дата</th>
                <th className="py-4 px-4 text-center">Контроль съемки</th>
                <th className="py-4 px-4">Статус</th>
                <th className="py-4 px-4">Этапы выполнения</th>
                <th className="py-4 px-5 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold">Объекты с заданными параметрами фильтрации не найдены</p>
                    <p className="text-xs mt-1">Попробуйте изменить поисковый запрос или сбросить фильтры</p>
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => {
                  const isOverdue = p.status === 'planned' && p.plannedDate < currentDate;
                  
                  // Расчет дней оставшихся/просроченных
                  const pDate = new Date(p.plannedDate);
                  const cDate = new Date(currentDate);
                  const diffTime = pDate.getTime() - cDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/70 transition-all ${isOverdue ? 'bg-red-50/10' : ''}`}
                    >
                      {/* Станция */}
                      <td className="py-4 px-5 font-bold text-slate-800">
                        <div 
                          onClick={() => onSelectProfile(p.id)}
                          className="hover:text-blue-600 cursor-pointer"
                        >
                          {p.station}
                        </div>
                      </td>

                      {/* Номер пути */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-700">{p.trackNumber}</span>
                          <div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block uppercase tracking-wider ${
                              p.trackType === 'main' 
                                ? 'bg-indigo-50 text-indigo-600' 
                                : p.trackType === 'station' 
                                  ? 'bg-amber-50 text-amber-600' 
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Станционный' : 'Прочий'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Предприятие */}
                      <td className="py-4 px-4 text-slate-600 text-xs">
                        {p.enterprise}
                      </td>

                      {/* Плановая дата */}
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{p.plannedDate}</span>
                        </div>
                      </td>

                      {/* Своевременность / Контроль */}
                      <td className="py-4 px-4 text-center">
                        {p.status === 'planned' ? (
                          isOverdue ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-bold px-2 py-1 rounded-full border border-red-100">
                              <AlertTriangle className="w-3 h-3" />
                              Просрочено {Math.abs(diffDays)} дн.
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                              diffDays <= 15 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-50 text-slate-500'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {diffDays} дн.
                            </span>
                          )
                        ) : (
                          // Сравнение фактической даты с плановой
                          p.actualShotDate && (
                            p.actualShotDate <= p.plannedDate ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-xs font-bold px-2 py-1 rounded-full">
                                <Check className="w-3.5 h-3.5" />
                                В срок
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-xs font-bold px-2 py-1 rounded-full">
                                С опозданием
                              </span>
                            )
                          )
                        )}
                      </td>

                      {/* Статус бейджик */}
                      <td className="py-4 px-4">
                        {p.status === 'planned' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            В плане
                          </span>
                        )}
                        {p.status === 'shot' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
                            <Play className="w-3.5 h-3.5 text-blue-500" />
                            Снято
                          </span>
                        )}
                        {p.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
                            <FileCheck className="w-3.5 h-3.5 text-amber-500" />
                            Утверждено
                          </span>
                        )}
                        {p.status === 'tra_updated' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            Внесено в ТРА
                          </span>
                        )}
                      </td>

                      {/* Даты жизненного цикла */}
                      <td className="py-4 px-4 text-xs space-y-1 text-slate-500">
                        {p.actualShotDate && (
                          <div><span className="font-medium text-slate-400">Съемка:</span> <span className="font-mono">{p.actualShotDate}</span></div>
                        )}
                        {p.approvalDate && (
                          <div><span className="font-medium text-slate-400">Утвержден:</span> <span className="font-mono">{p.approvalDate}</span></div>
                        )}
                        {p.traUpdateDate && (
                          <div><span className="font-medium text-slate-400">ТРА изменен:</span> <span className="font-mono">{p.traUpdateDate}</span></div>
                        )}
                        {!p.actualShotDate && <span className="text-slate-400 font-medium">Работа еще не начата</span>}
                      </td>

                      {/* Кнопки действий */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Быстрые действия workflow для планшета */}
                          {p.status !== 'tra_updated' && (
                            <button 
                              onClick={() => handleOpenQuickAction(p)}
                              title={
                                p.status === 'planned' 
                                  ? "Отметить съемку как выполненную" 
                                  : p.status === 'shot' 
                                    ? "Отметить профиль как утвержденный" 
                                    : "Внести изменения в ТРА станции"
                              }
                              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 shadow-sm cursor-pointer ${
                                p.status === 'planned' 
                                  ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                                  : p.status === 'shot' 
                                    ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
                                    : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>
                                {p.status === 'planned' ? 'Отснять' : p.status === 'shot' ? 'Утвердить' : 'ТРА'}
                              </span>
                            </button>
                          )}

                          {/* Кнопка полного редактирования */}
                          <button 
                            onClick={() => onEditProfile(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="Редактировать карточку"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Кнопка удаления */}
                          <button 
                            onClick={() => {
                              if (window.confirm(`Вы уверены, что хотите удалить объект "${p.station} - ${p.trackNumber}" из программы?`)) {
                                onDeleteProfile(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Удалить из программы"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно быстрого продвижения статуса (Workflow Slider) */}
      {quickActionProfile && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-500" />
                Быстрое изменение статуса
              </h3>
              <button 
                onClick={() => setQuickActionProfile(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-1">
                <p className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Объект контроля</p>
                <p className="text-base font-bold text-slate-800">{quickActionProfile.station}</p>
                <p className="text-xs font-semibold text-slate-600">{quickActionProfile.trackNumber}</p>
              </div>

              {/* Текущий и Следующий шаг */}
              <div className="flex items-center gap-3 justify-center text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Текущий этап</span>
                  <span className="font-semibold text-slate-700">
                    {quickActionProfile.status === 'planned' && 'В плане'}
                    {quickActionProfile.status === 'shot' && 'Съемка выполнена'}
                    {quickActionProfile.status === 'approved' && 'Утверждено'}
                  </span>
                </div>
                <div className="text-blue-500 font-bold">➔</div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Новый этап</span>
                  <span className="font-bold text-blue-600">
                    {quickActionProfile.status === 'planned' && 'Съемка выполнена'}
                    {quickActionProfile.status === 'shot' && 'Профиль утвержден'}
                    {quickActionProfile.status === 'approved' && 'Изменения внесены в ТРА'}
                  </span>
                </div>
              </div>

              {/* Поля ввода даты */}
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">
                    {quickActionProfile.status === 'planned' && 'Укажите фактическую дату съемки профиля'}
                    {quickActionProfile.status === 'shot' && 'Укажите дату утверждения профиля службой пути'}
                    {quickActionProfile.status === 'approved' && 'Укажите дату утверждения ТРА станции'}
                  </label>
                  <input 
                    type="date" 
                    value={quickDateValue}
                    onChange={(e) => setQuickDateValue(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                {quickActionProfile.status === 'approved' && (
                  <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-xs font-bold text-slate-500">Номер приказа / распоряжения о внесении изменений в ТРА</label>
                    <input 
                      type="text" 
                      placeholder="Например: НЗ-14/ТРА или № 245-р"
                      value={quickDocValue}
                      onChange={(e) => setQuickDocValue(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Подвал */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button 
                onClick={() => setQuickActionProfile(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
              >
                Отмена
              </button>
              <button 
                onClick={handleConfirmQuickAction}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-100 cursor-pointer"
              >
                Сохранить этап
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно импорта Excel */}
      {isExcelImportOpen && (
        <ExcelImporter 
          onImport={onImportProfiles}
          onClose={() => setIsExcelImportOpen(false)}
        />
      )}
    </div>
  );
};
