/**
 * Вспомогательные утилиты для работы с датами и форматами в приложении
 */

/**
 * Преобразует строку даты из формата YYYY-MM-DD (или ISO) в формат ДД.ММ.ГГГГ
 * @param dateStr Строка с датой
 */
export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';

  // Если дата уже в формате ДД.ММ.ГГГГ
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
    return trimmed;
  }

  // Если дата в формате YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return `${match[3]}.${match[2]}.${match[1]}`;
  }

  // Для прочих ISO-строк или дат
  try {
    const date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
  } catch (e) {
    // игнорируем ошибку парсинга
  }

  return trimmed;
}

export interface TbStatusResult {
  hasViolation: boolean; // Было ли нарушение вообще (активное или устраненное)
  isActive: boolean;     // Активен ли запрет ТБ прямо сейчас
  isResolved: boolean;   // Нарушение было, но теперь устранено (запрет снят)
  limitYears: number;    // Срок действия съемки в годах (3 или 10)
  deadlineDateStr: string; // Крайняя дата в формате YYYY-MM-DD
}

/**
 * Рассчитывает статус запрета закрепления тормозными башмаками (ТБ)
 */
export function getTbProhibitionStatus(
  profile: {
    category: string;
    trackNumber: string | number;
    prevSurveyDate?: string;
    status: string;
    approvalDate?: string;
    traUpdateDate?: string;
    actualShotDate?: string;
  },
  currentDate: string = '2026-07-03'
): TbStatusResult {
  const result: TbStatusResult = {
    hasViolation: false,
    isActive: false,
    isResolved: false,
    limitYears: 10,
    deadlineDateStr: ''
  };

  if (profile.category !== 'survey' || !profile.prevSurveyDate) {
    return result;
  }

  const dateStr = String(profile.prevSurveyDate).trim();
  let isoPrevDate = '';
  const matchIso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    isoPrevDate = dateStr.substring(0, 10);
  } else {
    const matchDot = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (matchDot) {
      isoPrevDate = `${matchDot[3]}-${matchDot[2]}-${matchDot[1]}`;
    }
  }

  if (!isoPrevDate) return result;

  const match = isoPrevDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return result;

  const year = parseInt(match[1]);
  const month = match[2];
  const day = match[3];

  const trackNumStr = String(profile.trackNumber || '');
  const isSorting = trackNumStr.toLowerCase().includes('сортировоч');
  const limitYears = isSorting ? 3 : 10;
  result.limitYears = limitYears;

  const deadlineYear = year + limitYears;
  const deadlineDateStr = `${deadlineYear}-${month}-${day}`;
  result.deadlineDateStr = deadlineDateStr;

  // Если статус решен ('approved' или 'tra_updated'), то активного запрета нет.
  // Но проверяем, было ли решение просрочено
  const isCompleted = profile.status === 'approved' || profile.status === 'tra_updated';

  if (!isCompleted) {
    if (currentDate > deadlineDateStr) {
      result.isActive = true;
      result.hasViolation = true;
    }
  } else {
    // Вспомогательная функция приведения дат вех к ISO YYYY-MM-DD
    const getIsoDate = (dStr?: string): string => {
      if (!dStr) return '';
      const trimmed = dStr.trim();
      const mIso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (mIso) return trimmed.substring(0, 10);
      const mDot = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (mDot) return `${mDot[3]}-${mDot[2]}-${mDot[1]}`;
      return '';
    };

    // Дата решения: сначала ТРА, затем утверждение, затем фактическая съемка
    const compDate = getIsoDate(profile.traUpdateDate) || getIsoDate(profile.approvalDate) || getIsoDate(profile.actualShotDate);
    
    if (compDate) {
      if (compDate > deadlineDateStr) {
        result.isResolved = true;
        result.hasViolation = true;
      }
    } else {
      // Если даты вех не указаны, но текущая дата больше срока,
      // то считаем, что утвердили с опозданием (или просто наступил срок)
      if (currentDate > deadlineDateStr) {
        result.isResolved = true;
        result.hasViolation = true;
      }
    }
  }

  return result;
}

