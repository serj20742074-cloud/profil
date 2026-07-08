import React from 'react';
import { 
  Download, Upload, RefreshCw, AlertTriangle, FileSpreadsheet, 
  CheckCircle2, HelpCircle, BookOpen, HardDrive
} from 'lucide-react';
import { TrackProfile } from '../types';
import { INITIAL_PROFILES } from '../mockData';
import { ExcelImporter } from './ExcelImporter';

interface BackupManagerProps {
  profiles: TrackProfile[];
  onImportProfiles: (imported: TrackProfile[], strategy: 'append' | 'overwrite') => void;
  onResetToDefault: () => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  profiles,
  onImportProfiles,
  onResetToDefault
}) => {
  const [importStatus, setImportStatus] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = React.useState(false);

  // 1. Экспорт в JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `track_profiles_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // 2. Импорт из JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Простейшая проверка структуры объектов
          const isValid = parsed.every(item => item.station && item.trackNumber && item.plannedDate && item.status);
          if (isValid) {
            onImportProfiles(parsed, 'overwrite');
            setImportStatus({ type: 'success', message: 'Программа успешно импортирована из резервного файла!' });
          } else {
            setImportStatus({ type: 'error', message: 'Неверный формат данных. Убедитесь, что файл содержит корректные профили.' });
          }
        } else {
          setImportStatus({ type: 'error', message: 'Импортируемый объект не является массивом.' });
        }
      } catch (err) {
        setImportStatus({ type: 'error', message: 'Ошибка при чтении JSON-файла. Файл поврежден.' });
      }
    };
    fileReader.readAsText(file);
    // Сбросим значение инпута для возможности повторного выбора
    e.target.value = '';
  };

  // 3. Экспорт в CSV (Excel-совместимый, с кодировкой UTF-8 BOM для русской кодировки)
  const handleExportCSV = () => {
    const headers = [
      "Станция", 
      "Номер пути", 
      "Категория пути", 
      "Плановая дата съемки", 
      "Исполнитель (Предприятие)", 
      "Статус", 
      "Фактическая дата съемки", 
      "Дата утверждения", 
      "Дата изменений ТРА", 
      "№ распоряжения ТРА", 
      "Ответственный", 
      "Примечания"
    ];

    const rows = profiles.map(p => {
      const typeLabel = p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий';
      let statusLabel = '';
      switch (p.status) {
        case 'planned': statusLabel = 'В плане'; break;
        case 'shot': statusLabel = 'Съемка выполнена'; break;
        case 'approved': statusLabel = 'Профиль утвержден'; break;
        case 'tra_updated': statusLabel = 'Изменения внесены в ТРА'; break;
      }

      return [
        p.station,
        p.trackNumber,
        typeLabel,
        p.plannedDate,
        p.enterprise || '',
        statusLabel,
        p.actualShotDate || '',
        p.approvalDate || '',
        p.traUpdateDate || '',
        p.traDocNumber || '',
        p.executorName || '',
        (p.notes || '').replace(/[\r\n]+/g, ' ') // убираем переносы строк
      ];
    });

    // Соединяем в CSV с разделителем точка с запятой (стандарт в русской локализации Excel)
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
    ].join('\r\n');

    // UTF-8 BOM для корректного отображения русских букв в Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `program_profiles_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Справка и Инструкция */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          Справка по работе с приложением
        </h3>

        <div className="space-y-4 text-xs md:text-sm text-slate-600 leading-relaxed">
          <div className="space-y-1">
            <h4 className="font-bold text-slate-800">1. Назначение системы</h4>
            <p>
              Приложение обеспечивает автоматизированный учет и жесткий контроль соблюдения сроков годовой программы съемки и выправки продольных профилей железнодорожных путей, их согласования и своевременного изменения Техническо-распорядительных актов (ТРА) станций.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-800">2. Жизненный цикл контроля пути</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-400 block uppercase">Этап 1: План</span>
                Путь включен в график на год. Отображается время, оставшееся до съемки.
              </div>
              <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-600 block uppercase">Этап 2: Съемка</span>
                Съемка выполнена дистанцией (ПЧ) или ПИП. Чертежи готовятся к согласованию.
              </div>
              <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                <span className="font-bold text-amber-600 block uppercase">Этап 3: Утвержден</span>
                Профиль утвержден руководством. Запущено время на изменение ТРА станции.
              </div>
              <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-600 block uppercase">Этап 4: ТРА готов</span>
                Полный цикл завершен. В ТРА внесены изменения. Данные сошлись.
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h4 className="font-bold text-slate-800">3. Автономность и Работа Офлайн</h4>
            <p>
              Приложение полностью спроектировано как <strong>PWA (Progressive Web App)</strong>. Вся база данных сохраняется в локальной памяти планшета (<code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-xs">localStorage</code>). Вы можете полноценно редактировать записи, импортировать файлы Excel и формировать отчеты, находясь на перегоне без интернета.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-2 mt-4">
            <h4 className="font-bold text-blue-800 flex items-center gap-1.5 text-sm">
              <span className="flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-xs font-black">↓</span>
              Инструкция по установке на планшет Huawei / Android
            </h4>
            <p className="text-xs text-blue-700 leading-relaxed">
              Приложение можно установить как обычную программу прямо из браузера (без Google Play Маркета и APK-файлов):
            </p>
            <ol className="list-decimal pl-5 text-xs text-blue-800 space-y-1">
              <li>Откройте ссылку на приложение в <strong>стандартном браузере Huawei</strong> или <strong>Google Chrome</strong> на планшете.</li>
              <li>Нажмите на <strong>кнопку меню</strong> браузера (три точки в правом верхнем углу) или иконку «Поделиться».</li>
              <li>Выберите пункт <strong>«Добавить на рабочий стол»</strong> (или <strong>«Установить приложение»</strong>).</li>
              <li>На рабочем столе планшета появится ярлык <strong>«СК-ПРОФИЛИ»</strong>.</li>
              <li>При запуске с этого ярлыка приложение будет открываться на весь экран в полноэкранном режиме и работать <strong>полностью автономно</strong> без подключения к сети.</li>
            </ol>
            <p className="text-[11px] text-blue-600 italic">
              *Встроенный Service Worker автоматически кэширует все скрипты, шрифты, таблицы и стили при первом запуске, поэтому приложение мгновенно загрузится на перегоне даже в режиме полета.
            </p>
          </div>
        </div>
      </div>

      {/* Панель экспорта, импорта и сброса */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-500" />
          Резервные копии и Данные
        </h3>

        {/* Индикатор успеха/ошибки импорта */}
        {importStatus && (
          <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-semibold ${
            importStatus.type === 'success' 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
              : 'bg-red-50 border-red-100 text-red-800'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${importStatus.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`} />
            <div>
              <p>{importStatus.message}</p>
              <button 
                onClick={() => setImportStatus(null)}
                className="mt-1 text-[10px] underline block hover:opacity-80"
              >
                Закрыть уведомление
              </button>
            </div>
          </div>
        )}

        {/* Экспорт и Импорт кнопки */}
        <div className="space-y-3">
          
          {/* Экспорт CSV */}
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              Экспорт таблицы в Excel (CSV)
            </span>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          {/* Импорт XLSX */}
          <button
            onClick={() => setIsExcelImportOpen(true)}
            className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/10 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              Импорт программы из Excel (.xlsx)
            </span>
            <Upload className="w-4 h-4 text-slate-400" />
          </button>

          {/* Экспорт JSON */}
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-blue-600" />
              Скачать бэкап базы (.json)
            </span>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          {/* Импорт JSON */}
          <div className="relative">
            <input 
              type="file" 
              accept=".json"
              onChange={handleImportJSON}
              id="json-upload-input"
              className="hidden"
            />
            <label
              htmlFor="json-upload-input"
              className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 rounded-xl transition-all text-sm font-semibold text-slate-700 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Загрузить бэкап базы (.json)
              </span>
              <Upload className="w-4 h-4 text-slate-400" />
            </label>
          </div>

        </div>

        {/* Сброс данных к начальным */}
        <div className="border-t border-slate-100 pt-4 space-y-2.5">
          <h4 className="text-xs font-bold text-red-600 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Опасная зона
          </h4>
          <p className="text-xs text-slate-400">
            Вы можете восстановить исходную тестовую программу (13 путей ВСЖД) в любой момент. Это сотрет текущую локальную базу.
          </p>
          <button
            onClick={() => {
              if (window.confirm('Внимание! Это полностью удалит ваши текущие записи и восстановит начальную программу съемок 2026 года. Продолжить?')) {
                onResetToDefault();
                setImportStatus({ type: 'success', message: 'Демонстрационная программа успешно восстановлена!' });
              }
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs p-3 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Восстановить демонстрационные данные
          </button>
        </div>

      </div>

      {/* Модальное окно импорта Excel */}
      {isExcelImportOpen && (
        <ExcelImporter 
          onImport={(newProfiles, strategy) => {
            onImportProfiles(newProfiles, strategy);
            setImportStatus({ 
              type: 'success', 
              message: `Успешно импортировано ${newProfiles.length} записей с помощью стратегии: ${strategy === 'append' ? 'добавление' : 'полная перезапись'}.` 
            });
          }}
          onClose={() => setIsExcelImportOpen(false)}
        />
      )}

    </div>
  );
};
