import React from 'react';
import { 
  FileSpreadsheet, Upload, Download, CheckCircle2, 
  AlertTriangle, Play, FileCheck, Clock, X, Trash2, ArrowRight
} from 'lucide-react';
import { TrackProfile, ProfileStatus } from '../types';
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  onImport: (newProfiles: TrackProfile[], strategy: 'append' | 'overwrite') => void;
  onClose: () => void;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  onImport,
  onClose
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [mappedProfiles, setMappedProfiles] = React.useState<TrackProfile[]>([]);
  const [strategy, setStrategy] = React.useState<'append' | 'overwrite'>('append');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);
  const [dragActive, setDragActive] = React.useState<boolean>(false);

  // Спецификация маппинга колонок Excel (ищет совпадения по русским и английским названиям)
  const mapRowToProfile = (row: any, index: number): TrackProfile => {
    // Вспомогательная функция поиска значения по синонимам заголовков
    const getValue = (keys: string[]): any => {
      for (const k of keys) {
        const lowerK = k.toLowerCase();
        // Ищем точное или частичное совпадение ключа в строке excel
        const foundKey = Object.keys(row).find(
          rk => rk.toLowerCase().trim() === lowerK || rk.toLowerCase().includes(lowerK)
        );
        if (foundKey) return row[foundKey];
      }
      return undefined;
    };

    // Нормализация дат
    const parseDate = (val: any): string => {
      if (!val) return '';
      if (typeof val === 'number') {
        // Excel дата (количество дней от 30.12.1899)
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
      }
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

      const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dotMatch) {
        return `${dotMatch[3]}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
      }

      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (slashMatch) {
        return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
      }

      try {
        const parsed = new Date(str);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      } catch (e) {}

      return str;
    };

    // Нормализация типа пути
    const getTrackType = (val: any): 'main' | 'station' | 'special' => {
      if (!val) return 'station';
      const str = String(val).trim().toLowerCase();
      if (str.includes('главн') || str.includes('main') || str === 'i' || str === '1') return 'main';
      if (str.includes('спец') || str.includes('проч') || str.includes('special') || str.includes('сортир')) return 'special';
      return 'station';
    };

    // Нормализация статуса
    const getStatus = (val: any): ProfileStatus => {
      if (!val) return 'planned';
      const str = String(val).trim().toLowerCase();
      if (str.includes('тра') || str.includes('внесено') || str.includes('готово') || str === 'tra_updated') return 'tra_updated';
      if (str.includes('утвержд') || str === 'approved') return 'approved';
      if (str.includes('снят') || str.includes('съемк') || str === 'shot') return 'shot';
      return 'planned';
    };

    const station = getValue(['станция', 'станция пути', 'station', 'наименование станции']) || 'Неизвестная станция';
    const trackNumber = getValue(['номер пути', 'путь', 'tracknumber', 'track', 'путь №']) || 'Путь не указан';
    const trackType = getTrackType(getValue(['категория пути', 'категория', 'тип пути', 'тип', 'tracktype']));
    const plannedDate = parseDate(getValue(['плановая дата', 'план', 'планируемая дата', 'дата плана', 'planneddate'])) || new Date().toISOString().slice(0, 10);
    const enterprise = getValue(['предприятие', 'исполнитель', 'пч', 'организация', 'enterprise']) || 'ПЧ (не указано)';
    const status = getStatus(getValue(['статус', 'состояние', 'status']));
    
    const actualShotDate = parseDate(getValue(['фактическая дата', 'дата съемки', 'actualshotdate', 'съемка факт']));
    const approvalDate = parseDate(getValue(['дата утверждения', 'утвержден', 'approvaldate']));
    const traUpdateDate = parseDate(getValue(['дата изменений тра', 'дата тра', 'traupdatedate']));
    const traDocNumber = getValue(['номер распоряжения', 'приказ', 'акт', 'документ', 'tradocnumber']);
    const executorName = getValue(['ответственный', 'инженер', 'исполнитель фио', 'executorname']);
    const notes = getValue(['примечания', 'примечание', 'заметки', 'notes', 'комментарий']);

    const generatedId = `excel-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;

    return {
      id: generatedId,
      station,
      trackNumber,
      trackType,
      plannedDate,
      enterprise,
      status,
      ...(actualShotDate && { actualShotDate }),
      ...(approvalDate && { approvalDate }),
      ...(traUpdateDate && { traUpdateDate }),
      ...(traDocNumber && { traDocNumber }),
      ...(executorName && { executorName }),
      ...(notes && { notes }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  // Чтение файла Excel через FileReader
  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.length === 0) {
          setError('Выбранный файл Excel пуст или поврежден.');
          return;
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Преобразуем в массив объектов
        const rows = XLSX.utils.sheet_to_json(worksheet);
        
        if (rows.length === 0) {
          setError('Лист Excel не содержит строк данных.');
          return;
        }

        setParsedRows(rows);

        // Маппим каждую строку на TrackProfile
        const profiles = rows.map((row, idx) => mapRowToProfile(row, idx));
        setMappedProfiles(profiles);
      } catch (err) {
        setError('Не удалось прочитать файл. Убедитесь, что это корректный файл Excel (.xlsx, .xls).');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0]);
    }
  };

  // Drag and drop события
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Подтвердить и отправить данные в главное состояние
  const handleConfirmImport = () => {
    if (mappedProfiles.length === 0) return;
    onImport(mappedProfiles, strategy);
    setSuccess(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Скачать эталонный шаблон Excel
  const handleDownloadTemplate = () => {
    const headers = [
      "Станция", 
      "Номер пути", 
      "Категория пути (Главный/Станционный/Специальный)", 
      "Плановая дата съемки (ГГГГ-ММ-ДД)", 
      "Предприятие-исполнитель", 
      "Ответственный (ФИО)",
      "Примечания"
    ];

    const sampleRows = [
      ["Иркутск-Пассажирский", "Главный путь № II", "Главный", "2026-08-10", "ПЧ-13 Иркутск-Пассажирская дистанция", "Сидоров В.А.", "Плановые работы по выправке продольного профиля"],
      ["Слюдянка-1", "Путь № 5 (приемо-отправочный)", "Станционный", "2026-09-15", "ПЧ-10 Слюдянская дистанция пути", "Иванов П.С.", "После ремонта стрелочного перевода"],
      ["Ангарск", "Путь № 7 (сортировочный)", "Специальный", "2026-10-01", "ПС-26 Проектно-изыскательская партия", "Петров А.Н.", "Съемка по программе контроля путей"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Шаблон Программы");

    // Зададим ширину колонок для красивого отображения в Excel
    worksheet['!cols'] = [
      { wch: 25 }, // Станция
      { wch: 25 }, // Номер пути
      { wch: 25 }, // Категория пути
      { wch: 30 }, // Плановая дата
      { wch: 35 }, // Исполнитель
      { wch: 25 }, // Ответственный
      { wch: 45 }  // Примечания
    ];

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
    downloadAnchor.setAttribute("download", `программа_съемки_шаблон_2026.xlsx`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Хедер модального окна */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">Импорт программы съемок из Excel</h3>
              <p className="text-[11px] text-slate-400">Быстрая загрузка годовой программы съемки и выправки профилей в базу планшета</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Тело модального окна */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Блок скачивания шаблона */}
          <div className="bg-blue-50/50 rounded-xl border border-blue-100/60 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs md:text-sm">
            <div className="space-y-1">
              <h4 className="font-bold text-blue-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                Рекомендуется использовать стандартный шаблон Excel
              </h4>
              <p className="text-blue-700/80 leading-relaxed max-w-xl">
                Мы умеем автоматически распознавать русские и латинские заголовки колонок, но использование нашего готового файла гарантирует безошибочный импорт программы.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="shrink-0 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 hover:border-blue-300 font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer text-xs"
            >
              <Download className="w-4 h-4" />
              Скачать шаблон .xlsx
            </button>
          </div>

          {/* Зона загрузки файла */}
          {!file ? (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50/30' 
                  : 'border-slate-200 hover:border-emerald-500 hover:bg-slate-50/40'
              }`}
            >
              <input 
                type="file" 
                id="excel-file-uploader" 
                accept=".xlsx, .xls" 
                onChange={onFileInputChange}
                className="hidden" 
              />
              <label htmlFor="excel-file-uploader" className="cursor-pointer flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 text-sm">Перетащите сюда файл Excel или выберите на устройстве</p>
                  <p className="text-xs text-slate-400">Поддерживаются форматы .xlsx и .xls</p>
                </div>
              </label>
            </div>
          ) : (
            /* Информация о выбранном файле */
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">{file.name}</h4>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} КБ • {mappedProfiles.length} записей распознано</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setParsedRows([]);
                  setMappedProfiles([]);
                  setError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                title="Очистить и выбрать другой"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            </div>
          )}

          {/* Отображение Ошибки */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 text-red-800 rounded-xl flex items-start gap-2.5 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* Настройки стратегии импорта и превью, если файл прочитан */}
          {mappedProfiles.length > 0 && !error && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Выбор стратегии */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Выберите стратегию импорта данных</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Стратегия: Append */}
                  <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all select-none ${
                    strategy === 'append' 
                      ? 'bg-white border-blue-500 ring-2 ring-blue-500/10' 
                      : 'bg-white border-slate-200 hover:bg-slate-50/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="importStrategy" 
                      value="append" 
                      checked={strategy === 'append'} 
                      onChange={() => setStrategy('append')}
                      className="mt-1 text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-xs md:text-sm block">Объединить с текущими (Добавить)</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Все загруженные пути будут добавлены к уже существующей программе на планшете.</span>
                    </div>
                  </label>

                  {/* Стратегия: Overwrite */}
                  <label className={`p-3 rounded-xl border cursor-pointer flex items-start gap-3 transition-all select-none ${
                    strategy === 'overwrite' 
                      ? 'bg-white border-red-500 ring-2 ring-red-500/10' 
                      : 'bg-white border-slate-200 hover:bg-slate-50/20'
                  }`}>
                    <input 
                      type="radio" 
                      name="importStrategy" 
                      value="overwrite" 
                      checked={strategy === 'overwrite'} 
                      onChange={() => setStrategy('overwrite')}
                      className="mt-1 text-red-600 focus:ring-red-500 border-slate-300"
                    />
                    <div>
                      <span className="font-bold text-slate-800 text-xs md:text-sm block">Полностью заменить базу (Перезаписать)</span>
                      <span className="text-[11px] text-slate-400 block mt-0.5">Внимание: текущая локальная база путей сотрется и заменится строками из файла.</span>
                    </div>
                  </label>

                </div>
              </div>

              {/* Превью распознанных путей */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Предварительный просмотр данных ({mappedProfiles.length} строк)</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 sticky top-0 border-b border-slate-200 font-bold text-slate-500">
                        <th className="py-2.5 px-3">Станция</th>
                        <th className="py-2.5 px-3">Номер пути</th>
                        <th className="py-2.5 px-3">Категория</th>
                        <th className="py-2.5 px-3">План съемки</th>
                        <th className="py-2.5 px-3">Исполнитель</th>
                        <th className="py-2.5 px-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappedProfiles.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 text-slate-700">
                          <td className="py-2 px-3 font-semibold text-slate-900">{p.station}</td>
                          <td className="py-2 px-3">{p.trackNumber}</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              p.trackType === 'main' ? 'bg-indigo-50 text-indigo-700' : p.trackType === 'station' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Станционный' : 'Прочий'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-medium text-slate-600">{p.plannedDate}</td>
                          <td className="py-2 px-3 truncate max-w-[150px]">{p.enterprise}</td>
                          <td className="py-2 px-3">
                            {p.status === 'planned' && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">В плане</span>}
                            {p.status === 'shot' && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold">Снято</span>}
                            {p.status === 'approved' && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold">Утверждено</span>}
                            {p.status === 'tra_updated' && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold">В ТРА</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Подвал модального окна */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div>
            {success && (
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm animate-bounce">
                <CheckCircle2 className="w-5 h-5" />
                Импорт успешно завершен!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-xl cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={mappedProfiles.length === 0 || !!error || success}
              onClick={handleConfirmImport}
              className="px-5 py-2.5 text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-200 cursor-pointer flex items-center gap-1.5"
            >
              Импортировать в базу
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
