import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  AlertTriangle, CheckCircle2, Clock, Calendar, FileText, 
  TrendingUp, BarChart2, ShieldAlert, ArrowRight, MapPin, Gauge
} from 'lucide-react';
import { TrackProfile, AnalyticsSummary } from '../types';
import { formatDate, getTbProhibitionStatus } from '../utils';

interface DashboardProps {
  profiles: TrackProfile[];
  currentDate: string;
  onSelectProfile: (profileId: string) => void;
  onNavigateToTab: (tab: string, filters?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profiles, currentDate, onSelectProfile, onNavigateToTab }) => {
  const [categoryFilter, setCategoryFilter] = React.useState<'all' | 'survey' | 'alignment'>('all');

  // Фильтруем профили по выбранной категории
  const filteredProfiles = React.useMemo(() => {
    if (categoryFilter === 'all') return profiles;
    return profiles.filter(p => p.category === categoryFilter);
  }, [profiles, categoryFilter]);

  // Вычисление километража для выправки
  const alignmentKmStats = React.useMemo(() => {
    const alignmentProfiles = profiles.filter(p => p.category === 'alignment');
    const plannedKm = alignmentProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const completedKm = alignmentProfiles.reduce((sum, p) => sum + (p.completedVolume || 0), 0);
    return {
      plannedKm: parseFloat(plannedKm.toFixed(3)),
      completedKm: parseFloat(completedKm.toFixed(3)),
      percent: plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0
    };
  }, [profiles]);

  // Вычисление километража для съемки
  const surveyKmStats = React.useMemo(() => {
    const surveyProfiles = profiles.filter(p => p.category === 'survey');
    const plannedKm = surveyProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const completedKm = surveyProfiles
      .filter(p => p.status === 'tra_updated' || p.status === 'approved')
      .reduce((sum, p) => sum + (p.workVolume || 0), 0);
    return {
      plannedKm: parseFloat(plannedKm.toFixed(3)),
      completedKm: parseFloat(completedKm.toFixed(3)),
      percent: plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0
    };
  }, [profiles]);

  // 1. Вычисление метрик для отфильтрованных профилей
  const summary = React.useMemo<AnalyticsSummary>(() => {
    let planned = 0;
    let shot = 0;
    let approved = 0;
    let traUpdated = 0;
    let overdue = 0;
    let upcoming = 0;

    filteredProfiles.forEach(p => {
      // Подсчет по статусам
      if (p.status === 'planned') {
        planned++;
        
        // Проверка просрочки
        if (p.plannedDate && p.plannedDate < currentDate) {
          overdue++;
        } else if (p.plannedDate) {
          // Проверка предстоящих (ближайшие 15 дней)
          const pDate = new Date(p.plannedDate);
          const cDate = new Date(currentDate);
          const diffTime = pDate.getTime() - cDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 15) {
            upcoming++;
          }
        }
      } else if (p.status === 'shot') {
        shot++;
      } else if (p.status === 'approved') {
        approved++;
      } else if (p.status === 'tra_updated') {
        traUpdated++;
      }
    });

    return {
      total: filteredProfiles.length,
      planned,
      shot,
      approved,
      traUpdated,
      overdue,
      upcoming
    };
  }, [filteredProfiles]);

  // 2. Данные для графика выполнения плана по месяцам
  const monthlyChartData = React.useMemo(() => {
    const months = [
      { name: 'Янв', code: '01', planned: 0, actual: 0 },
      { name: 'Фев', code: '02', planned: 0, actual: 0 },
      { name: 'Мар', code: '03', planned: 0, actual: 0 },
      { name: 'Апр', code: '04', planned: 0, actual: 0 },
      { name: 'Май', code: '05', planned: 0, actual: 0 },
      { name: 'Июн', code: '06', planned: 0, actual: 0 },
      { name: 'Июл', code: '07', planned: 0, actual: 0 },
      { name: 'Авг', code: '08', planned: 0, actual: 0 },
      { name: 'Сен', code: '09', planned: 0, actual: 0 },
      { name: 'Окт', code: '10', planned: 0, actual: 0 },
      { name: 'Ноя', code: '11', planned: 0, actual: 0 },
      { name: 'Дек', code: '12', planned: 0, actual: 0 },
    ];

    filteredProfiles.forEach(p => {
      // Плановые месяцы
      if (p.plannedDate) {
        const planMonthStr = p.plannedDate.substring(5, 7);
        const planMonthObj = months.find(m => m.code === planMonthStr);
        if (planMonthObj) {
          planMonthObj.planned += 1;
        }
      }

      // Фактически выполненная съемка или выправка
      const actualDate = p.category === 'alignment' ? p.actualAlignmentDate : p.actualShotDate;
      if (p.status !== 'planned' && actualDate) {
        const actMonthStr = actualDate.substring(5, 7);
        const actMonthObj = months.find(m => m.code === actMonthStr);
        if (actMonthObj) {
          actMonthObj.actual += 1;
        }
      }
    });

    return months;
  }, [filteredProfiles]);

  // 3. Данные по предприятиям
  const enterpriseChartData = React.useMemo(() => {
    const counts: { [key: string]: { name: string; completed: number; pending: number; total: number } } = {};
    
    filteredProfiles.forEach(p => {
      const ent = p.pch || p.enterprise || 'Не указано';
      const shortName = ent.replace(' дистанция пути', '').replace('Путевая машинная станция', 'ПМС').replace('Проектно-изыскательская партия', 'ПИП');

      if (!counts[shortName]) {
        counts[shortName] = { name: shortName, completed: 0, pending: 0, total: 0 };
      }
      
      counts[shortName].total += 1;
      if (p.status === 'tra_updated' || p.status === 'approved') {
        counts[shortName].completed += 1;
      } else {
        counts[shortName].pending += 1;
      }
    });

    return Object.values(counts);
  }, [filteredProfiles]);

  // 4. Распределение по статусам для круговой диаграммы
  const statusPieData = React.useMemo(() => {
    const statuses = [
      { name: 'В плане', value: summary.planned - summary.overdue, color: '#94A3B8' }, // Slate-400
      { name: 'Просрочено', value: summary.overdue, color: '#EF4444' }, // Red-500
      { name: 'Выполнено (согласование)', value: summary.shot, color: '#3B82F6' }, // Blue-500
      { name: 'Утверждено', value: summary.approved, color: '#F59E0B' }, // Amber-500
      { name: 'Внесено в ТРА', value: summary.traUpdated, color: '#10B981' }, // Emerald-500
    ];
    return statuses.filter(item => item.value > 0);
  }, [summary]);

  // 5. Определение критически важных объектов (просроченных или предстоящих срочно)
  const criticalProfiles = React.useMemo(() => {
    return filteredProfiles
      .filter(p => p.status === 'planned')
      .map(p => {
        const isOverdue = p.plannedDate && p.plannedDate < currentDate;
        const pDate = new Date(p.plannedDate || currentDate);
        const cDate = new Date(currentDate);
        const diffTime = pDate.getTime() - cDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...p,
          isOverdue,
          daysLeft: diffDays,
        };
      })
      .filter(p => p.isOverdue || (p.daysLeft >= 0 && p.daysLeft <= 15))
      .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''));
  }, [filteredProfiles]);

  // Процент общего выполнения программы
  const completionPercentage = React.useMemo(() => {
    if (filteredProfiles.length === 0) return 0;
    return Math.round((summary.traUpdated / filteredProfiles.length) * 100);
  }, [filteredProfiles, summary]);

  // Процент съемки (хотя бы отснято)
  const shotPercentage = React.useMemo(() => {
    if (filteredProfiles.length === 0) return 0;
    const totalShotOrBetter = summary.shot + summary.approved + summary.traUpdated;
    return Math.round((totalShotOrBetter / filteredProfiles.length) * 100);
  }, [filteredProfiles, summary]);

  // Профили с активным запретом тормозных башмаков (истек срок съемки и статус не завершен)
  const tbForbiddenProfiles = React.useMemo(() => {
    return profiles.filter(p => getTbProhibitionStatus(p, currentDate).isActive);
  }, [profiles]);

  // Профили с устраненным нарушением (ранее был запрет, но теперь новый профиль утвержден/внесен в ТРА)
  const resolvedTbProfiles = React.useMemo(() => {
    return profiles.filter(p => getTbProhibitionStatus(p, currentDate).isResolved);
  }, [profiles]);

  return (
    <div className="space-y-6">
      {/* Категории контроля - Переключатель */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-100 p-1.5 rounded-2xl gap-2 w-full max-w-2xl border border-slate-200">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`w-full sm:w-auto text-center font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            categoryFilter === 'all' 
              ? 'bg-white text-slate-800 shadow-sm' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Все работы
        </button>
        <button
          onClick={() => setCategoryFilter('survey')}
          className={`w-full sm:w-auto text-center font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            categoryFilter === 'survey' 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          1. Съемка профиля
        </button>
        <button
          onClick={() => setCategoryFilter('alignment')}
          className={`w-full sm:w-auto text-center font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer ${
            categoryFilter === 'alignment' 
              ? 'bg-emerald-600 text-white shadow-sm' 
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          2. Выправка профиля
        </button>
      </div>

      {/* Предупреждение о запрете тормозных башмаков */}
      {tbForbiddenProfiles.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-rose-900 text-sm md:text-base">КРИТИЧЕСКОЕ ПРЕДУПРЕЖДЕНИЕ БЕЗОПАСНОСТИ: ЗАПРЕТ ЗАКРЕПЛЕНИЯ ТБ!</h4>
              <p className="text-xs md:text-sm text-rose-700 leading-relaxed">
                Найдено <span className="font-bold font-mono">{tbForbiddenProfiles.length}</span> путей, где срок действия предыдущей съемки (предыдущего профиля) превысил 10 лет (для сортировочных путей — более 3 лет). 
                Закрепление вагонов тормозными башмаками на данных путях <strong>КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО</strong>!
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('program', { tbForbiddenFilter: true })} 
            className="w-full sm:w-auto shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Показать пути ({tbForbiddenProfiles.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Уведомление об устраненных нарушениях */}
      {resolvedTbProfiles.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-extrabold text-emerald-900 text-sm md:text-base">НАРУШЕНИЯ УСПЕШНО УСТРАНЕНЫ: ЗАПРЕТ ТБ СНЯТ</h4>
              <p className="text-xs md:text-sm text-emerald-700 leading-relaxed">
                На <span className="font-bold font-mono">{resolvedTbProfiles.length}</span> путях ранее было превышение нормативного срока продольного профиля (было нарушение), но к настоящему моменту новые профили успешно утверждены и внесены изменения в ТРА. <strong>Запрет на закрепление вагонов ТБ успешно снят, безопасность полностью обеспечена!</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigateToTab('program', { tbResolvedFilter: true })} 
            className="w-full sm:w-auto shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>Показать пути ({resolvedTbProfiles.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Приветствие и Общие Индикаторы */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-5 rounded-2xl border border-slate-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            {categoryFilter === 'all' && "Комплексный контроль продольных профилей"}
            {categoryFilter === 'survey' && "Программа съемок продольного профиля"}
            {categoryFilter === 'alignment' && "Программа выправки продольного профиля"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Текущая дата контроля: <span className="font-semibold text-slate-700">03 июля 2026 г.</span> (разгар летне-путевых работ)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block uppercase font-semibold">
              {categoryFilter === 'alignment' ? 'Выправлено путей' : 'Съемка путей'}
            </span>
            <span className="text-lg font-bold text-slate-800">{shotPercentage}% выполнено</span>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full ${categoryFilter === 'alignment' ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${shotPercentage}%` }}></div>
          </div>
          <div className="border-l border-slate-100 pl-4 text-right">
            <span className="text-xs text-slate-400 block uppercase font-semibold">Полный цикл (ТРА)</span>
            <span className="text-lg font-bold text-emerald-600">{completionPercentage}% готово</span>
          </div>
          <div className="w-24 bg-slate-100 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${completionPercentage}%` }}></div>
          </div>
        </div>
      </div>

      {/* Дополнительные Километровые Метрики при выборе конкретной программы */}
      {categoryFilter !== 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
            <div className={`p-3 rounded-xl ${categoryFilter === 'alignment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
              <Gauge className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold block">Плановый объем работ</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-800">
                  {categoryFilter === 'alignment' ? alignmentKmStats.plannedKm : surveyKmStats.plannedKm}
                </span>
                <span className="text-sm font-bold text-slate-500">км путей</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-slate-100">
            <div className={`p-3 rounded-xl ${categoryFilter === 'alignment' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs text-slate-400 uppercase font-semibold block">Фактический объем выполнения</span>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${categoryFilter === 'alignment' ? 'text-emerald-700' : 'text-blue-700'}`}>
                  {categoryFilter === 'alignment' ? alignmentKmStats.completedKm : surveyKmStats.completedKm}
                </span>
                <span className="text-sm font-bold text-slate-500">км ({categoryFilter === 'alignment' ? alignmentKmStats.percent : surveyKmStats.percent}%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ключевые показатели (KPI Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Общий план */}
        <div 
          onClick={() => onNavigateToTab('program', { statusFilter: 'all', overdueFilter: false, tbForbiddenFilter: false, upcomingFilter: false, tbResolvedFilter: false })}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] hover:bg-slate-50/50"
        >
          <div className="space-y-2">
            <span className="text-sm text-slate-500 font-medium">Всего в плане</span>
            <div className="text-3xl font-extrabold text-slate-800">{summary.total}</div>
            <span className="text-xs text-slate-400 block">путей в программе</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <Calendar className="w-6 h-6 text-slate-500" />
          </div>
        </div>

        {/* Просрочено */}
        <div 
          onClick={() => onNavigateToTab('program', { overdueFilter: true, statusFilter: 'all' })}
          className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] ${summary.overdue > 0 ? 'bg-red-50/50 border-red-100 hover:bg-red-50' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
        >
          <div className="space-y-2">
            <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
              Просрочено
              {summary.overdue > 0 && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
            </span>
            <div className="text-3xl font-extrabold text-red-600">{summary.overdue}</div>
            <span className="text-xs text-red-400 block">требуются работы</span>
          </div>
          <div className="p-3 bg-red-100/50 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        {/* Ближайшие */}
        <div 
          onClick={() => onNavigateToTab('program', { upcomingFilter: true, statusFilter: 'planned' })}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] hover:bg-slate-50"
        >
          <div className="space-y-2">
            <span className="text-sm text-amber-600 font-medium">Предстоит (15дн)</span>
            <div className="text-3xl font-extrabold text-amber-600">{summary.upcoming}</div>
            <span className="text-xs text-slate-400 block">в графике работ</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        {/* Выполнено (согласование) */}
        <div 
          onClick={() => onNavigateToTab('program', { statusFilter: 'shot' })}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] hover:bg-blue-50/20"
        >
          <div className="space-y-2">
            <span className="text-sm text-blue-600 font-medium">
              {categoryFilter === 'alignment' ? 'Выправлено' : 'Снято профилей'}
            </span>
            <div className="text-3xl font-extrabold text-blue-600">{summary.shot}</div>
            <span className="text-xs text-slate-400 block">на этапе проверки</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Gauge className="w-6 h-6 text-blue-500" />
          </div>
        </div>

        {/* Ожидают ТРА / Утверждено */}
        <div 
          onClick={() => onNavigateToTab('program', { statusFilter: 'approved' })}
          className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] hover:bg-indigo-50/20"
        >
          <div className="space-y-2">
            <span className="text-sm text-indigo-600 font-medium">Утверждено</span>
            <div className="text-3xl font-extrabold text-indigo-600">{summary.approved}</div>
            <span className="text-xs text-slate-400 block">ожидает внесения в ТРА</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <FileText className="w-6 h-6 text-indigo-500" />
          </div>
        </div>

        {/* Запрет ТБ */}
        <div 
          onClick={() => onNavigateToTab('program', { tbForbiddenFilter: true })}
          className={`p-5 rounded-2xl border shadow-sm flex items-start justify-between cursor-pointer transition-transform hover:scale-[1.01] ${tbForbiddenProfiles.length > 0 ? 'bg-rose-50/50 border-rose-100 hover:bg-rose-50' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
        >
          <div className="space-y-2">
            <span className="text-sm text-rose-600 font-extrabold flex items-center gap-1">
              Запрет ТБ
              {tbForbiddenProfiles.length > 0 && <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
            </span>
            <div className="text-3xl font-black text-rose-600">{tbForbiddenProfiles.length}</div>
            <span className="text-xs text-rose-400 block">путей под запретом</span>
          </div>
          <div className="p-3 bg-rose-100/50 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Основная часть: Графики и Критические предупреждения */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* График прогресса по месяцам (2/3 ширины) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Выполнение программы по месяцам (2026 г.)
            </h3>
            <span className="text-xs text-slate-400 font-mono">План vs Факт</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748B', fontSize: 12 }} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: 'none', color: '#FFF' }}
                  labelClassName="text-slate-400 font-bold"
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar name="Запланировано работ" dataKey="planned" fill="#CBD5E1" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar name="Фактически выполнено" dataKey="actual" fill={categoryFilter === 'alignment' ? '#10B981' : '#3B82F6'} radius={[4, 4, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Круговая диаграмма распределения статусов */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
            Распределение по статусам
          </h3>
          
          <div className="h-44 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Текст в центре */}
            <div className="absolute text-center">
              <span className="text-2xl font-black text-slate-800">{summary.total}</span>
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Объектов</span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs max-h-32 overflow-y-auto pr-1">
            {statusPieData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800 font-mono">{item.value} шт ({Math.round(item.value / summary.total * 100)}%)</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Нижняя часть: Сводка по предприятиям и Срочные критические работы */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Критически важные работы: Просроченные или предстоящие (2/3 ширины) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
              Критический статус: Нарушение сроков и Срочный контроль
            </h3>
            <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-bold">
              {criticalProfiles.length} объектов
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {criticalProfiles.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">Все съемки выполняются в установленные сроки!</p>
                <p className="text-xs text-slate-400 mt-1">Просроченных или горящих планов нет.</p>
              </div>
            ) : (
              criticalProfiles.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => onSelectProfile(p.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    p.isOverdue 
                      ? 'bg-red-50/40 border-red-100 hover:border-red-200' 
                      : 'bg-amber-50/40 border-amber-100 hover:border-amber-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm md:text-base">{p.station}</span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                        {p.trackNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {p.enterprise}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-xs text-slate-400 block">План: {formatDate(p.plannedDate)}</span>
                      <span className={`text-xs font-bold ${p.isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                        {p.isOverdue 
                          ? `Просрочено на ${Math.abs(p.daysLeft)} дн.` 
                          : `Осталось дней: ${p.daysLeft}`
                        }
                      </span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Рейтинг выполнения предприятий (1/3 ширины) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-500" />
            Нагрузка по предприятиям
          </h3>
          
          <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
            {enterpriseChartData.map((ent, idx) => {
              const compPercent = ent.total > 0 ? Math.round((ent.completed / ent.total) * 100) : 0;
              return (
                <div key={idx} className="space-y-1.5 p-2 hover:bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-bold text-slate-700 truncate max-w-[160px] md:max-w-[200px]" title={ent.name}>
                      {ent.name}
                    </span>
                    <span className="font-mono text-slate-500">
                      {ent.completed}/{ent.total} шт ({compPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        compPercent === 100 
                          ? 'bg-emerald-500' 
                          : compPercent > 50 
                            ? 'bg-blue-500' 
                            : 'bg-amber-500'
                      }`} 
                      style={{ width: `${compPercent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
