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
  forcedCategory?: 'survey' | 'alignment';
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({
  onImport,
  onClose,
  forcedCategory
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [parsedRows, setParsedRows] = React.useState<any[]>([]);
  const [mappedProfiles, setMappedProfiles] = React.useState<TrackProfile[]>([]);
  const [strategy, setStrategy] = React.useState<'append' | 'overwrite'>('append');
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<boolean>(false);
  const [dragActive, setDragActive] = React.useState<boolean>(false);

  // Спецификация маппинга колонок Excel (ищет совпадения по русским и английским названиям)
  const mapRowToProfile = (row: any, index: number, sheetName?: string): TrackProfile => {
    const normalizeKey = (s: string): string => {
      return String(s)
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[\s\r\n\-\_\(\)\,\.\/]+/g, '')
        .trim();
    };

    // Вспомогательная функция поиска значения по синонимам заголовков с интеллектуальным нормализованным сравнением
    const getValue = (keys: string[]): any => {
      // 1. Попробуем точное совпадение нормализованных ключей
      for (const k of keys) {
        const normK = normalizeKey(k);
        if (!normK) continue;
        const foundKey = Object.keys(row).find(rk => normalizeKey(rk) === normK);
        if (foundKey) return row[foundKey];
      }
      
      // 2. Попробуем частичное совпадение для достаточно длинных и специфичных ключей (длина > 3)
      for (const k of keys) {
        const normK = normalizeKey(k);
        if (!normK || normK.length <= 3) continue;
        const foundKey = Object.keys(row).find(rk => {
          const normRk = normalizeKey(rk);
          return normRk.includes(normK) || normK.includes(normRk);
        });
        if (foundKey) return row[foundKey];
      }
      
      // 3. Последний шанс: частичное совпадение для коротких ключей
      for (const k of keys) {
        const normK = normalizeKey(k);
        if (!normK) continue;
        const foundKey = Object.keys(row).find(rk => {
          const normRk = normalizeKey(rk);
          return normRk.includes(normK);
        });
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

      const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
      if (dotMatch) {
        let year = dotMatch[3];
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }
        return `${year}-${dotMatch[2].padStart(2, '0')}-${dotMatch[1].padStart(2, '0')}`;
      }

      const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (slashMatch) {
        let year = slashMatch[3];
        if (year.length === 2) {
          year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
        }
        return `${year}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
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
    const getTrackType = (val: any, trackNumText?: string): 'main' | 'station' | 'special' => {
      let str = val ? String(val).trim().toLowerCase() : '';
      if (!str && trackNumText) {
        str = String(trackNumText).trim().toLowerCase();
      }
      if (!str) return 'station';
      if (str.includes('главн') || str.includes('main') || str === 'i' || str === '1' || str === 'ii' || str === 'iii' || str === 'iv') return 'main';
      if (str.includes('проч') || str.includes('спец') || str.includes('special') || str.includes('сортир') || str.includes('выставоч') || str.includes('соединит') || str.includes('весов') || str.includes('ходов')) return 'special';
      if (str.includes('прием') || str.includes('отправ') || str.includes('станц') || str.includes('station')) return 'station';
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

    const hasAlignmentKeys = Object.keys(row).some(rk => {
      const low = rk.toLowerCase();
      return low.includes('выправка') || low.includes('уклон') || low.includes('цель') || low.includes('выполненн');
    });

    let category: 'survey' | 'alignment' = forcedCategory || (hasAlignmentKeys ? 'alignment' : 'survey');
    if (!forcedCategory && sheetName) {
      const lowSheet = sheetName.toLowerCase();
      if (lowSheet.includes('выправка') || lowSheet.includes('alignment')) {
        category = 'alignment';
      } else if (lowSheet.includes('съемка') || lowSheet.includes('survey')) {
        category = 'survey';
      }
    }

    const rawStation = getValue(['станция', 'станция пути', 'station', 'наименование станции']);
    const station = rawStation !== undefined && rawStation !== null ? String(rawStation).trim() : 'Неизвестная станция';

    const rawTrackNumber = getValue(['номер пути', 'путь', 'tracknumber', 'track', 'путь №', '№№ путей', '№ путей']);
    const trackNumber = rawTrackNumber !== undefined && rawTrackNumber !== null ? String(rawTrackNumber).trim() : 'Путь не указан';

    const trackType = getTrackType(getValue(['категория пути', 'категория', 'тип пути', 'тип', 'tracktype', 'специализация', 'назначение пути', 'специализация пути', 'назначение']), trackNumber);
    
    // Специализация пути (из файла или рассчитанная на основе ТРА)
    const rawTrackSpecialization = getValue(['специализация пути', 'специализация', 'назначение пути', 'назначение', 'категория пути', 'категория', 'тип пути', 'тип', 'tracktype', 'trackspecialization']);
    let trackSpecialization = rawTrackSpecialization !== undefined && rawTrackSpecialization !== null ? String(rawTrackSpecialization).trim() : '';

    if (!trackSpecialization && trackNumber && trackNumber !== 'Путь не указан') {
      const low = trackNumber.toLowerCase();
      if (low.includes('главн') || low.includes('main') || ['i', 'ii', 'iii', 'iv', '1', '2', '3', '4'].includes(low.trim())) {
        trackSpecialization = 'Главный';
      } else if (low.includes('сортир') && low.includes('отправ')) {
        trackSpecialization = 'Сортировочно-отправочный';
      } else if (low.includes('выставоч')) {
        trackSpecialization = 'Выставочный';
      } else if (low.includes('соединит')) {
        trackSpecialization = 'Соединительный';
      } else if (low.includes('весов')) {
        trackSpecialization = 'Весовой';
      } else if (low.includes('ходов')) {
        trackSpecialization = 'Ходовой';
      } else if (low.includes('сортир')) {
        trackSpecialization = 'Сортировочный';
      } else if (low.includes('прием') || low.includes('отправ') || low.includes('станц') || low.includes('station')) {
        trackSpecialization = 'Приемо-отправочный';
      }
    }
    if (!trackSpecialization) {
      trackSpecialization = trackType === 'main' ? 'Главный' : trackType === 'station' ? 'Приемо-отправочный' : 'Прочий';
    }
    
    // Срок исполнения или квартал или плановая дата
    const rawPlannedDate = getValue(['плановая дата', 'планируемая дата', 'дата плана', 'planneddate']);
    const rawTerm = getValue(['плановый срок', 'планируемый срок', 'срок выполнения', 'срок исполнения', 'срок', 'квартал', 'quarter']);

    let plannedDate = '';
    let quarter = '';

    const isValidISODate = (str: string): boolean => {
      return /^\d{4}-\d{2}-\d{2}$/.test(str);
    };

    const parseQuarterToDate = (qStr: string): string => {
      const low = qStr.toLowerCase();
      let year = '2026';
      const yearMatch = low.match(/(202\d)/);
      if (yearMatch) {
        year = yearMatch[1];
      }

      if (low.includes('i кв') || low.includes('1 кв') || low.includes('1-й кв') || low.includes('первый кв')) {
        return `${year}-03-15`;
      }
      if (low.includes('ii кв') || low.includes('2 кв') || low.includes('2-й кв') || low.includes('второй кв')) {
        return `${year}-06-15`;
      }
      if (low.includes('iii кв') || low.includes('3 кв') || low.includes('3-й кв') || low.includes('третий кв')) {
        return `${year}-09-15`;
      }
      if (low.includes('iv кв') || low.includes('4 кв') || low.includes('4-й кв') || low.includes('четвертый кв')) {
        return `${year}-12-15`;
      }
      return '';
    };

    const parsedPlanned = parseDate(rawPlannedDate);
    const parsedTerm = parseDate(rawTerm);

    if (isValidISODate(parsedPlanned)) {
      plannedDate = parsedPlanned;
      if (rawTerm && !isValidISODate(parsedTerm)) {
        quarter = String(rawTerm).trim();
      }
    } else if (isValidISODate(parsedTerm)) {
      plannedDate = parsedTerm;
    } else {
      // Ни один не является валидной датой YYYY-MM-DD
      const textVal = rawPlannedDate || rawTerm;
      if (textVal) {
        const textStr = String(textVal).trim();
        quarter = textStr;
        plannedDate = parseQuarterToDate(textStr);
      }
    }
    
    const rawEnterprise = getValue(['предприятие', 'исполнитель', 'пч', 'организация', 'enterprise']);
    const enterprise = rawEnterprise !== undefined && rawEnterprise !== null ? String(rawEnterprise).trim() : 'ПЧ (не указано)';
    
    // Новые поля для Выправки и Съемки
    const pch = getValue(['пч', 'дистанция', 'pch']) || (typeof enterprise === 'string' && enterprise.startsWith('ПЧ') ? enterprise : undefined);
    const workVolume = parseFloat(getValue(['объем работ', 'объем', 'volume', 'км', 'объем работ, км', 'объем работ (км)'])) || undefined;
    const completedVolume = parseFloat(getValue(['объем выполненных', 'выполнено км', 'выполненных работ', 'completedvolume', 'объем выполненных работ (км)'])) || undefined;
    
    const actualAlignmentDate = parseDate(getValue(['дата выправки', 'дата выправки факт', 'actualalignmentdate']));
    const actualShotDate = parseDate(getValue(['фактическая дата', 'дата съемки', 'actualshotdate', 'съемка факт', 'дата съемки']));
    const profileCheckDsDate = parseDate(getValue(['дата проверки профиля дс', 'проверка дс', 'profilecheckdsdate', 'дата проверки профиля']));
    const approvalDate = parseDate(getValue(['дата утверждения', 'утвержден', 'approvaldate', 'дата утверждения профиля']));
    const profileProvideStationDate = parseDate(getValue(['дата предоставления', 'предоставление на станцию', 'profileprovidestationdate', 'дата предоставления профиля на станцию']));
    const traActCreateDate = parseDate(getValue(['дата создания акта', 'создание акта', 'traactcreatedate', 'дата создания акта изменения в тра']));
    const traActApproveDate = parseDate(getValue(['дата утверждения акта', 'утверждение акта', 'traactapprovedate', 'дата утверждения акта тра', 'дата утверждения акта изменения тра']));
    const traUpdateDate = parseDate(getValue(['дата изменений тра', 'дата изменений', 'тра изменения', 'traupdatedate', 'дата внесения изменений в тра']));

    // Интеллектуальный расчет статуса на основе введенных дат, если столбец статус отсутствует/пуст/planned
    let status = getStatus(getValue(['статус', 'состояние', 'status']));
    if (status === 'planned') {
      if (traUpdateDate || traActApproveDate || traActCreateDate) {
        status = 'tra_updated';
      } else if (approvalDate || profileProvideStationDate || profileCheckDsDate) {
        status = 'approved';
      } else if (actualShotDate || actualAlignmentDate) {
        status = 'shot';
      }
    }
    
    const rawAlignmentGoal = getValue(['цель работ', 'цель', 'alignmentgoal']);
    const alignmentGoal = rawAlignmentGoal !== undefined && rawAlignmentGoal !== null ? String(rawAlignmentGoal).trim() : undefined;

    const rawSlopeBeforeAfter = getValue(['приведенный уклон', 'уклон до/после', 'slopebeforeafter', 'приведенный уклон пути до/после выправки']);
    const slopeBeforeAfter = rawSlopeBeforeAfter !== undefined && rawSlopeBeforeAfter !== null ? String(rawSlopeBeforeAfter).trim() : undefined;

    const rawTbBeforeAfter = getValue(['количество т/б', 'т/б до/после', 'tbbeforeafter', 'количество т/б до/после выправки']);
    const tbBeforeAfter = rawTbBeforeAfter !== undefined && rawTbBeforeAfter !== null ? String(rawTbBeforeAfter).trim() : undefined;

    const prevSurveyDate = parseDate(getValue(['дата предыдущей съемки', 'предыдущая съемка', 'prevsurveydate', 'дата предыдущей съемки']));
    
    const rawTraDocNumber = getValue(['номер распоряжения', 'приказ', 'акт', 'документ', 'tradocnumber', 'акт изменения в тра']);
    const traDocNumber = rawTraDocNumber !== undefined && rawTraDocNumber !== null ? String(rawTraDocNumber).trim() : undefined;

    const rawExecutorName = getValue(['ответственный', 'инженер', 'исполнитель фио', 'executorname']);
    const executorName = rawExecutorName !== undefined && rawExecutorName !== null ? String(rawExecutorName).trim() : undefined;

    const extractNotes = (): string | undefined => {
      const noteFields = [
        'примечания', 'примечание', 'заметки', 'notes', 'комментарий', 'комментарии', 
        'причины невыполнения', 'причины не выполнения', 'что сделано', 'описание причин', 'причина',
        'примечание (достижение цели работ'
      ];
      const normNoteFields = noteFields.map(nf => normalizeKey(nf));
      const foundValues: string[] = [];
      Object.keys(row).forEach(rk => {
        const normRk = normalizeKey(rk);
        const matches = normNoteFields.some(nf => normRk === nf || normRk.includes(nf) || nf.includes(normRk));
        if (matches) {
          const val = row[rk];
          if (val !== undefined && val !== null) {
            const strVal = String(val).trim();
            if (strVal && !foundValues.includes(strVal)) {
              if (normRk.includes('причин') || normRk.includes('сделано') || normRk.includes('комментар') || normRk.includes('примечан')) {
                foundValues.push(`${rk.replace(/\r?\n/g, ' ').trim()}: ${strVal}`);
              } else {
                foundValues.push(strVal);
              }
            }
          }
        }
      });
      return foundValues.length > 0 ? foundValues.join('; ') : undefined;
    };
    const notes = extractNotes();

    const generatedId = `excel-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`;

    return {
      id: generatedId,
      category,
      station,
      trackNumber,
      trackType,
      trackSpecialization,
      plannedDate: plannedDate || '2026-06-30', // fallback
      enterprise,
      status,
      ...(pch && { pch }),
      ...(workVolume !== undefined && !isNaN(workVolume) && { workVolume }),
      ...(completedVolume !== undefined && !isNaN(completedVolume) && { completedVolume }),
      ...(quarter && { quarter }),
      ...(actualAlignmentDate && { actualAlignmentDate }),
      ...(actualShotDate && { actualShotDate }),
      ...(profileCheckDsDate && { profileCheckDsDate }),
      ...(approvalDate && { approvalDate }),
      ...(profileProvideStationDate && { profileProvideStationDate }),
      ...(traActCreateDate && { traActCreateDate }),
      ...(traActApproveDate && { traActApproveDate }),
      ...(traUpdateDate && { traUpdateDate }),
      ...(alignmentGoal && { alignmentGoal }),
      ...(slopeBeforeAfter && { slopeBeforeAfter }),
      ...(tbBeforeAfter && { tbBeforeAfter }),
      ...(prevSurveyDate && { prevSurveyDate }),
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

        let allProfiles: TrackProfile[] = [];
        let totalRowsParsed = 0;

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet);
          totalRowsParsed += rows.length;
          
          const sheetProfiles = rows.map((row, idx) => mapRowToProfile(row, idx + totalRowsParsed, sheetName));
          allProfiles = [...allProfiles, ...sheetProfiles];
        });
        
        if (allProfiles.length === 0) {
          setError('Листы Excel не содержат строк данных.');
          return;
        }

        setParsedRows(allProfiles);
        setMappedProfiles(allProfiles);
      } catch (err: any) {
        console.error('Excel parsing error:', err);
        setError(`Не удалось прочитать файл. Ошибка: ${err?.message || err}. Убедитесь, что это корректный файл Excel (.xlsx, .xls).`);
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
    const surveyHeaders = [
      "Станция", 
      "Номер пути", 
      "Категория пути (Главный/Приемо-отправочный/Прочий)", 
      "Плановая дата съемки (ГГГГ-ММ-ДД)", 
      "Объем работ (км)",
      "Предприятие-исполнитель", 
      "Ответственный (ФИО)",
      "Примечания"
    ];

    const surveyRows = [
      ["Иркутск-Пассажирский", "Главный путь № II", "Главный", "2026-08-10", "1.25", "ПЧ-13 Иркутск-Пассажирская дистанция", "Сидоров В.А.", "Плановая съемка продольного профиля пути"],
      ["Слюдянка-1", "Путь № 5", "Приемо-отправочный", "2026-09-15", "0.85", "ПЧ-10 Слюдянская дистанция пути", "Иванов П.С.", "После ремонта стрелочного перевода"]
    ];

    const alignmentHeaders = [
      "Станция", 
      "Номер пути", 
      "Категория пути (Главный/Приемо-отправочный/Прочий)", 
      "Плановая дата выправки (ГГГГ-ММ-ДД)", 
      "Объем работ (км)",
      "Предприятие-исполнитель", 
      "Ответственный (ФИО)",
      "Цель работ",
      "Приведенный уклон до/после",
      "Количество т/б до/после",
      "Примечания"
    ];

    const alignmentRows = [
      ["Ангарск", "Путь № 7", "Приемо-отправочный", "2026-06-20", "1.10", "ПМС-26 Иркутск", "Петров А.Н.", "Устранение просадок профиля", "4.2 / 3.8", "120 / 80", "Выправка машинным способом ВПО-3000"]
    ];

    const workbook = XLSX.utils.book_new();

    const surveySheet = XLSX.utils.aoa_to_sheet([surveyHeaders, ...surveyRows]);
    surveySheet['!cols'] = [
      { wch: 25 }, // Станция
      { wch: 20 }, // Номер пути
      { wch: 25 }, // Категория пути
      { wch: 25 }, // Плановая дата
      { wch: 18 }, // Объем
      { wch: 35 }, // Исполнитель
      { wch: 22 }, // Ответственный
      { wch: 35 }  // Примечания
    ];
    XLSX.utils.book_append_sheet(workbook, surveySheet, "1. Съемка");

    const alignmentSheet = XLSX.utils.aoa_to_sheet([alignmentHeaders, ...alignmentRows]);
    alignmentSheet['!cols'] = [
      { wch: 25 }, // Станция
      { wch: 20 }, // Номер пути
      { wch: 25 }, // Категория пути
      { wch: 25 }, // Плановая дата
      { wch: 18 }, // Объем
      { wch: 30 }, // Исполнитель
      { wch: 22 }, // Ответственный
      { wch: 25 }, // Цель
      { wch: 22 }, // Уклон
      { wch: 22 }, // Т/Б
      { wch: 35 }  // Примечания
    ];
    XLSX.utils.book_append_sheet(workbook, alignmentSheet, "2. Выправка");

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
    downloadAnchor.setAttribute("download", `программа_профилей_шаблон.xlsx`);
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
              <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                {forcedCategory === 'alignment' ? 'Импорт программы выправки продольных профилей' : 'Импорт программы съемок из Excel'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {forcedCategory === 'alignment' 
                  ? 'Быстрая загрузка данных выправки продольных профилей из файла Excel' 
                  : 'Быстрая загрузка годовой программы съемки и выправки профилей в базу планшета'}
              </p>
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
                              {p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий')}
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
