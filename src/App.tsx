import React from 'react';
import { 
  BarChart2, Calendar, ClipboardList, HardDrive, FileText, 
  MapPin, Clock, AlertTriangle, CheckCircle2, User, 
  ArrowRight, X, Gauge, ShieldAlert
} from 'lucide-react';
import { TrackProfile, ProfileStatus } from './types';
import { INITIAL_PROFILES } from './mockData';
import { Dashboard } from './components/Dashboard';
import { ProfileTable } from './components/ProfileTable';
import { ProfileForm } from './components/ProfileForm';
import { TraChangeManager } from './components/TraChangeManager';
import { BackupManager } from './components/BackupManager';
import { MarkdownReport } from './components/MarkdownReport';
import { formatDate, getTbProhibitionStatus } from './utils';

export default function App() {
  const LOCAL_STORAGE_KEY = 'track_profiles_program_2026';
  const currentDate = '2026-07-03';

  // 1. Состояние профилей (база данных)
  const [profiles, setProfiles] = React.useState<TrackProfile[]>([]);
  const [isDataLoaded, setIsDataLoaded] = React.useState(false);

  // Инициализация при загрузке
  React.useEffect(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (cached) {
      try {
        setProfiles(JSON.parse(cached));
      } catch (e) {
        setProfiles(INITIAL_PROFILES);
      }
    } else {
      setProfiles(INITIAL_PROFILES);
    }
    setIsDataLoaded(true);
  }, []);

  // Сохранение в localStorage при изменениях
  const saveProfiles = (newProfiles: TrackProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newProfiles));
  };

  // 2. Вкладки навигации
  const [activeTab, setActiveTab] = React.useState<string>('dashboard');
  const [initialFilters, setInitialFilters] = React.useState<any>(null);

  // 3. Состояния форм и деталей
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingProfile, setEditingProfile] = React.useState<TrackProfile | null>(null);
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);

  // Подсчет количества критически просроченных для хедера
  const overdueCount = React.useMemo(() => {
    return profiles.filter(p => p.status === 'planned' && p.plannedDate < currentDate).length;
  }, [profiles]);

  // Выбранный профиль для просмотра деталей
  const selectedProfile = React.useMemo(() => {
    return profiles.find(p => p.id === selectedProfileId) || null;
  }, [profiles, selectedProfileId]);

  // Добавление новой работы
  const handleAddProfileClick = () => {
    setEditingProfile(null);
    setIsFormOpen(true);
  };

  // Редактирование работы
  const handleEditProfileClick = (profile: TrackProfile) => {
    setEditingProfile(profile);
    setIsFormOpen(true);
  };

  // Удаление работы
  const handleDeleteProfile = (profileId: string) => {
    const filtered = profiles.filter(p => p.id !== profileId);
    saveProfiles(filtered);
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
    }
  };

  // Сохранение (добавление или редактирование)
  const handleSaveProfile = (profile: TrackProfile) => {
    const exists = profiles.some(p => p.id === profile.id);
    let newProfiles: TrackProfile[];
    if (exists) {
      newProfiles = profiles.map(p => p.id === profile.id ? profile : p);
    } else {
      newProfiles = [profile, ...profiles];
    }
    saveProfiles(newProfiles);
    setIsFormOpen(false);
    setEditingProfile(null);
  };

  // Быстрое изменение статуса (продвижение по жизненному циклу)
  const handleQuickStatusChange = (
    profileId: string, 
    nextStatus: ProfileStatus, 
    dates: { [key: string]: string; doc?: string }
  ) => {
    const newProfiles = profiles.map(p => {
      if (p.id !== profileId) return p;

      const updated: TrackProfile = {
        ...p,
        status: nextStatus,
        updatedAt: new Date().toISOString()
      };

      if (dates.actualShotDate) updated.actualShotDate = dates.actualShotDate;
      if (dates.actualAlignmentDate) updated.actualAlignmentDate = dates.actualAlignmentDate;
      if (dates.approvalDate) updated.approvalDate = dates.approvalDate;
      if (dates.traUpdateDate) updated.traUpdateDate = dates.traUpdateDate;
      if (dates.doc) updated.traDocNumber = dates.doc;

      return updated;
    });

    saveProfiles(newProfiles);
  };

  // Импорт программы
  const handleImportProfiles = (imported: TrackProfile[], strategy: 'append' | 'overwrite' = 'overwrite') => {
    if (strategy === 'append') {
      const merged = [...profiles];
      imported.forEach(imp => {
        const idx = merged.findIndex(
          p => p.station.toLowerCase().trim() === imp.station.toLowerCase().trim() && 
               p.trackNumber.toLowerCase().trim() === imp.trackNumber.toLowerCase().trim()
        );
        if (idx > -1) {
          // Обновляем существующий путь новыми данными
          merged[idx] = { 
            ...merged[idx], 
            ...imp, 
            id: merged[idx].id,
            updatedAt: new Date().toISOString()
          };
        } else {
          // Добавляем новый
          merged.unshift(imp);
        }
      });
      saveProfiles(merged);
    } else {
      saveProfiles(imported);
    }
  };

  // Сброс к значениям по умолчанию
  const handleResetToDefault = () => {
    saveProfiles(INITIAL_PROFILES);
  };

  // Переход к просмотру конкретного профиля
  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
  };

  // Навигация из кликов по метрикам
  const handleNavigateToTab = (tab: string, filters?: any) => {
    if (filters) {
      setInitialFilters(filters);
    } else {
      setInitialFilters(null);
    }
    setActiveTab(tab);
  };

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Загрузка системы контроля профилей...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Шапка приложения (Header) - оптимизирована под планшет, крупная и контрастная */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs px-4 py-3 md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Название и Логотип */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">СК-ПРОФИЛИ</h1>
                <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Планшетный Контроль
                </span>
              </div>
              <p className="text-xs text-slate-400">Служба пути • Учет продольных профилей и ТРА станций</p>
            </div>
          </div>

          {/* Панель навигации по вкладкам */}
          <nav className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/30' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Главная</span>
            </button>

            <button
              onClick={() => setActiveTab('program')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'program' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/30' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Программа съемки</span>
              {overdueCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {overdueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('tra')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'tra' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/30' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Контроль ТРА</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'reports' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/30' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Анализ (Markdown)</span>
            </button>

            <button
              onClick={() => setActiveTab('backups')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'backups' 
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/30' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              <span>Справка и бэкапы</span>
            </button>
          </nav>

        </div>
      </header>

      {/* Основной контейнер приложения */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Отображение соответствующей вкладки */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            profiles={profiles} 
            onSelectProfile={handleSelectProfile} 
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === 'program' && (
          <ProfileTable 
            profiles={profiles} 
            onSelectProfile={handleSelectProfile}
            onEditProfile={handleEditProfileClick}
            onDeleteProfile={handleDeleteProfile}
            onAddProfileClick={handleAddProfileClick}
            onQuickStatusChange={handleQuickStatusChange}
            onImportProfiles={handleImportProfiles}
            initialFilters={initialFilters}
            clearInitialFilters={() => setInitialFilters(null)}
          />
        )}

        {activeTab === 'tra' && (
          <TraChangeManager 
            profiles={profiles} 
            onQuickStatusChange={handleQuickStatusChange}
            onSelectProfile={handleSelectProfile}
          />
        )}

        {activeTab === 'backups' && (
          <BackupManager 
            profiles={profiles} 
            onImportProfiles={handleImportProfiles}
            onResetToDefault={handleResetToDefault}
          />
        )}

        {activeTab === 'reports' && (
          <MarkdownReport 
            profiles={profiles} 
            currentDate={currentDate}
          />
        )}

      </main>

      {/* Футер */}
      <footer className="border-t border-slate-200/60 bg-white py-4 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Служба Пути. Система учета продольных профилей железнодорожных путей.</p>
          <p className="mt-1 font-medium text-slate-300">Разработано для мобильных планшетных устройств Huawei</p>
        </div>
      </footer>

      {/* МОДАЛЬНОЕ ОКНО / СПРАВА: Подробные детали профиля (Slide-Over Drawer) */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
          
          {/* Закрытие по клику мимо */}
          <div className="absolute inset-0" onClick={() => setSelectedProfileId(null)}></div>
          
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l border-slate-100 animate-in slide-in-from-right duration-200">
            
            {/* Хедер панели деталей */}
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-slate-800 text-base">Карточка объекта контроля</h3>
              </div>
              <button 
                onClick={() => setSelectedProfileId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Тело панели деталей */}
            <div className="flex-1 p-5 overflow-y-auto space-y-6">
              
              {/* Информация о пути */}
              <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Железнодорожная Станция</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                    selectedProfile.category === 'alignment' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedProfile.category === 'alignment' ? 'Выправка' : 'Съемка'}
                  </span>
                </div>
                <span className="text-xl font-extrabold text-slate-900 block">{selectedProfile.station}</span>
                <span className="text-sm font-semibold text-slate-600 block">{selectedProfile.trackNumber}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold inline-block mt-1 uppercase ${
                  selectedProfile.trackType === 'main' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedProfile.trackSpecialization ? `${selectedProfile.trackSpecialization} путь` : (selectedProfile.trackType === 'main' ? 'Главный путь' : selectedProfile.trackType === 'station' ? 'Приемо-отправочный путь' : 'Прочий путь')}
                </span>
              </div>

              {/* Интерактивная шкала (Timeline) Жизненного Цикла */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Этапы выполнения контроля</h4>
                
                <div className="relative pl-6 space-y-5 border-l border-slate-200 ml-3">
                  
                  {/* Шаг 1: Планирование */}
                  <div className="relative">
                    <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center shadow-xs"></span>
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs md:text-sm">Включение в план на 2026 г.</h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {selectedProfile.category === 'alignment' ? 'Плановая выправка' : 'Плановая съемка'}: <strong className="text-slate-600">{formatDate(selectedProfile.plannedDate)}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Шаг 2: Выполнение работы */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-xs ${
                      selectedProfile.status !== 'planned' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></span>
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs md:text-sm">
                        {selectedProfile.category === 'alignment' ? 'Фактическое выполнение выправки' : 'Фактическая съемка продольного профиля'}
                      </h5>
                      {selectedProfile.category === 'alignment' ? (
                        selectedProfile.actualAlignmentDate ? (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">Выправлено: {formatDate(selectedProfile.actualAlignmentDate)}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Ожидание выполнения выправки исполнителем</p>
                        )
                      ) : (
                        selectedProfile.actualShotDate ? (
                          <p className="text-xs text-emerald-600 font-semibold mt-0.5">Снято: {formatDate(selectedProfile.actualShotDate)}</p>
                        ) : (
                          <p className="text-xs text-slate-400 mt-0.5">Ожидание выполнения съемки исполнителем</p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Шаг 3: Утверждение */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-xs ${
                      selectedProfile.status === 'approved' || selectedProfile.status === 'tra_updated' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></span>
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs md:text-sm">
                        {selectedProfile.category === 'alignment' ? 'Приемка и утверждение результатов выправки' : 'Утверждение профиля службой пути'}
                      </h5>
                      {selectedProfile.approvalDate ? (
                        <p className="text-xs text-emerald-600 font-semibold mt-0.5">Утвержден: {formatDate(selectedProfile.approvalDate)}</p>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">На согласовании / приемке</p>
                      )}
                    </div>
                  </div>

                  {/* Шаг 4: ТРА */}
                  <div className="relative">
                    <span className={`absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full border-4 border-white flex items-center justify-center shadow-xs ${
                      selectedProfile.status === 'tra_updated' ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}></span>
                    <div>
                      <h5 className="font-bold text-slate-800 text-xs md:text-sm">Внесение изменений в ТРА станции</h5>
                      {selectedProfile.traUpdateDate ? (
                        <div className="space-y-0.5 mt-0.5">
                           <p className="text-xs text-emerald-600 font-semibold">Внесено в ТРА: {formatDate(selectedProfile.traUpdateDate)}</p>
                          <p className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md inline-block font-mono">
                            Приказ/Акт: {selectedProfile.traDocNumber}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-0.5">Бумажные акты не внесены в ТРА</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Детализация участников и заметок */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs md:text-sm">
                
                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Организация-исполнитель:</span>
                  <span className="font-bold text-slate-800 text-right max-w-[200px]">{selectedProfile.enterprise}</span>
                </div>

                {selectedProfile.executorName && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Инженер-исполнитель:</span>
                    <span className="font-bold text-slate-800">{selectedProfile.executorName}</span>
                  </div>
                )}

                {/* Объемы и параметры для выправки / съемки */}
                {selectedProfile.workVolume !== undefined && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Плановый объем (км):</span>
                    <span className="font-bold text-slate-800">{selectedProfile.workVolume} км</span>
                  </div>
                )}

                {selectedProfile.completedVolume !== undefined && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Выполненный объем (км):</span>
                    <span className="font-bold text-emerald-600">{selectedProfile.completedVolume} км</span>
                  </div>
                )}

                {selectedProfile.category === 'alignment' && selectedProfile.alignmentGoal && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Цель работ:</span>
                    <span className="font-bold text-slate-800 text-right">{selectedProfile.alignmentGoal}</span>
                  </div>
                )}

                {selectedProfile.category === 'alignment' && selectedProfile.slopeBeforeAfter && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Уклон до/после (‰):</span>
                    <span className="font-mono font-bold text-slate-800">{selectedProfile.slopeBeforeAfter}</span>
                  </div>
                )}

                {selectedProfile.category === 'alignment' && selectedProfile.tbBeforeAfter && (
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-400 font-semibold">Количество т/б до/после:</span>
                    <span className="font-mono font-bold text-slate-800">{selectedProfile.tbBeforeAfter}</span>
                  </div>
                )}

                {selectedProfile.category === 'survey' && selectedProfile.prevSurveyDate && (
                  <div className="space-y-1.5 py-1.5 border-b border-slate-50">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-semibold">Дата предыдущей съемки:</span>
                      <span className="font-mono font-bold text-slate-800">{formatDate(selectedProfile.prevSurveyDate)}</span>
                    </div>
                    {(() => {
                      const tbStatus = getTbProhibitionStatus(selectedProfile, currentDate);
                      if (tbStatus.isActive) {
                        return (
                          <div className="bg-rose-50 text-rose-800 text-[11px] p-2.5 rounded-lg border border-rose-100 flex items-start gap-1.5 mt-1 leading-normal">
                            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block text-rose-700">ЗАКРЕПЛЕНИЕ ТБ ЗАПРЕЩЕНО!</span>
                              Срок действия предыдущей съемки ({formatDate(selectedProfile.prevSurveyDate)}) превысил {tbStatus.limitYears} {tbStatus.limitYears === 3 ? 'года' : 'лет'} (истек {formatDate(tbStatus.deadlineDateStr)}) для {selectedProfile.trackNumber.toLowerCase().includes('сортировоч') ? 'сортировочного' : 'данного'} пути. Закреплять вагоны тормозными башмаками на данном пути категорически запрещено!
                            </div>
                          </div>
                        );
                      } else if (tbStatus.isResolved) {
                        return (
                          <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-lg border border-emerald-100 flex items-start gap-1.5 mt-1 leading-normal">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block text-emerald-700">ЗАПРЕТ ТБ СНЯТ (НАРУШЕНИЕ УСТРАНЕНО)!</span>
                              Срок действия предыдущей съемки ({formatDate(selectedProfile.prevSurveyDate)}) превышал {tbStatus.limitYears} {tbStatus.limitYears === 3 ? 'года' : 'лет'} (истек {formatDate(tbStatus.deadlineDateStr)}), но сейчас новый профиль успешно утвержден и внесен в ТРА. Нарушение устранено, запрет на закрепление вагонов ТБ официально снят.
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}

                <div className="flex justify-between py-1.5 border-b border-slate-50">
                  <span className="text-slate-400 font-semibold">Дата добавления:</span>
                  <span className="font-mono text-slate-600">
                    {new Date(selectedProfile.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {selectedProfile.notes && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-slate-400 font-bold block">Служебные примечания:</span>
                    <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border leading-relaxed">
                      {selectedProfile.notes}
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* Подвал панели деталей: Быстрое редактирование карточки */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedProfileId(null);
                  handleEditProfileClick(selectedProfile);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 rounded-xl text-center shadow-xs cursor-pointer"
              >
                Редактировать карточку
              </button>
              <button
                onClick={() => setSelectedProfileId(null)}
                className="px-4 py-2.5 bg-white text-slate-500 hover:text-slate-700 font-bold text-sm rounded-xl border border-slate-200 cursor-pointer"
              >
                Закрыть
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Окно Редактирования/Создания (ProfileForm) */}
      {isFormOpen && (
        <ProfileForm 
          profile={editingProfile}
          onSave={handleSaveProfile}
          onClose={() => setIsFormOpen(false)}
        />
      )}

    </div>
  );
}
