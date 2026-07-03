export type ProfileStatus = 'planned' | 'shot' | 'approved' | 'tra_updated';

export interface TrackProfile {
  id: string;
  station: string;          // Станция
  trackNumber: string;      // Номер пути (главный, приемо-отправочный и т.д.)
  trackType: 'main' | 'station' | 'special'; // Тип пути (Главный, Станционный, Специальный)
  plannedDate: string;      // Планируемая дата съемки (YYYY-MM-DD)
  enterprise: string;       // Предприятие, осуществляющее съемку (ПЧ, ПМС и др.)
  status: ProfileStatus;    // Текущий статус работы
  
  // Даты вех жизненного цикла
  actualShotDate?: string;  // Фактическая дата съемки
  approvalDate?: string;    // Дата утверждения профиля руководством дороги/службы
  traUpdateDate?: string;   // Дата внесения изменений в ТРА станции
  
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
