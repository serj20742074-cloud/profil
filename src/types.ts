export type ProfileStatus = 'planned' | 'shot' | 'approved' | 'tra_updated';

export interface TrackProfile {
  id: string;
  category: 'survey' | 'alignment'; // Категория контроля: съемка или выправка
  station: string;          // Станция
  trackNumber: string;      // Номер пути (главный, приемо-отправочный и т.д.)
  trackType: 'main' | 'station' | 'special'; // Тип пути (Главный, Приемо-отправочный, Прочий)
  trackSpecialization?: string; // Специализация пути (точно как в Excel файле)
  plannedDate: string;      // Планируемая дата съемки или выправки (YYYY-MM-DD)
  enterprise: string;       // Предприятие, осуществляющее работы (ПЧ, ИЧ, РЦДМ и др.)
  status: ProfileStatus;    // Текущий статус работы

  // Специфичные поля и вехи
  pch?: string;             // Код дистанции пути (ИЧ-4, ПЧ-43 и т.д.)
  workVolume?: number;      // Объем работ в км
  completedVolume?: number; // Объём выполненных работ (для выправки)
  quarter?: string;         // Квартал / Срок выполнения
  actualAlignmentDate?: string; // Дата выправки
  actualShotDate?: string;  // Фактическая дата съемки
  profileCheckDsDate?: string;  // Дата проверки профиля ДС
  approvalDate?: string;    // Дата утверждения профиля руководством дороги/службы (Дата утверждения профиля)
  profileProvideStationDate?: string; // Дата предоставления профиля на станцию
  traActCreateDate?: string;  // Дата создания акта изменения в ТРА
  traActApproveDate?: string; // Дата утверждения акта ТРА / утверждения акта изменения ТРА
  traUpdateDate?: string;   // Дата изменений ТРА

  alignmentGoal?: string;    // Цель работ (для выправки)
  slopeBeforeAfter?: string; // Приведенный уклон пути до/после выправки (для выправки)
  tbBeforeAfter?: string;    // Количество т/б до/после выправки (для выправки)
  prevSurveyDate?: string;   // Дата предыдущей съемки (для съемки)

  traDocNumber?: string;    // Номер акта/распоряжения о внесении изменений в ТРА
  executorName?: string;    // Ответственный исполнитель (ФИО)
  notes?: string;           // Примечания / Замечания
  
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  profileId: string;
  station: string;
  trackNumber: string;
  action: string;           // Описание действия
  date: string;             // Дата лога
  user: string;             // Кто внес изменения
}

export interface AnalyticsSummary {
  total: number;
  planned: number;
  shot: number;
  approved: number;
  traUpdated: number;
  overdue: number;          // Съемка просрочена
  upcoming: number;         // Съемка предстоит в ближайшие 15 дней
}
