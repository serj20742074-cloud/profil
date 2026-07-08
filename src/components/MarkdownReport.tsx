import React from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, Clipboard, Download, RefreshCw, Eye, Edit3, Check, AlertTriangle, ShieldAlert, BadgeInfo
} from 'lucide-react';
import { TrackProfile, ProfileStatus } from '../types';
import { formatDate, getTbProhibitionStatus } from '../utils';

interface MarkdownReportProps {
  profiles: TrackProfile[];
  currentDate?: string;
}

export const MarkdownReport: React.FC<MarkdownReportProps> = ({ profiles, currentDate = '2026-07-03' }) => {
  const [activeTab, setActiveTab] = React.useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = React.useState(false);
  const [reportText, setReportText] = React.useState('');

  // Генерация отчета на основе профилей
  const generateReport = React.useCallback(() => {
    const totalProfiles = profiles.length;
    const surveyProfiles = profiles.filter(p => p.category === 'survey');
    const alignmentProfiles = profiles.filter(p => p.category === 'alignment');

    const surveyCount = surveyProfiles.length;
    const surveyTraCount = surveyProfiles.filter(p => p.status === 'tra_updated').length;
    const surveyApprovedCount = surveyProfiles.filter(p => p.status === 'approved').length;
    const surveyShotCount = surveyProfiles.filter(p => p.status === 'shot').length;
    const surveyPlannedCount = surveyProfiles.filter(p => p.status === 'planned').length;

    const alignmentCount = alignmentProfiles.length;
    const alignmentCompletedCount = alignmentProfiles.filter(p => p.status === 'tra_updated' || p.status === 'approved').length;
    const alignmentShotCount = alignmentProfiles.filter(p => p.status === 'shot').length;
    const alignmentPlannedCount = alignmentProfiles.filter(p => p.status === 'planned').length;

    // Подсчет объемов (километража)
    const alignmentPlannedKm = alignmentProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const alignmentCompletedKm = alignmentProfiles.reduce((sum, p) => sum + (p.completedVolume || 0), 0);
    const alignmentPercent = alignmentPlannedKm > 0 ? Math.round((alignmentCompletedKm / alignmentPlannedKm) * 100) : 0;

    const surveyPlannedKm = surveyProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const surveyCompletedKm = surveyProfiles
      .filter(p => p.status === 'tra_updated' || p.status === 'approved')
      .reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const surveyPercent = surveyPlannedKm > 0 ? Math.round((surveyCompletedKm / surveyPlannedKm) * 100) : 0;

    // Запрет ТБ (активные просроченные съемки)
    const activeProhibitions = profiles.filter(p => {
      const tb = getTbProhibitionStatus(p, currentDate);
      return tb.isActive;
    });

    // Просроченные плановые работы
    const overdueWorks = profiles.filter(p => {
      return p.status === 'planned' && p.plannedDate && p.plannedDate < currentDate;
    });

    // Предстоящие в течение 15 дней
    const upcomingWorks = profiles.filter(p => {
      if (p.status !== 'planned' || !p.plannedDate) return false;
      const pDate = new Date(p.plannedDate);
      const cDate = new Date(currentDate);
      const diffTime = pDate.getTime() - cDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 15;
    });

    // Расчет по предприятиям (ПЧ / ИЧ / РЦДМ)
    const enterprises = Array.from(new Set(profiles.map(p => p.enterprise || 'Неизвестно')));
    const enterpriseStats = enterprises.map(ent => {
      const entProfiles = profiles.filter(p => p.enterprise === ent);
      const entAlign = entProfiles.filter(p => p.category === 'alignment');
      const plannedKm = entAlign.reduce((sum, p) => sum + (p.workVolume || 0), 0);
      const completedKm = entAlign.reduce((sum, p) => sum + (p.completedVolume || 0), 0);
      const percent = plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0;
      return {
        name: ent,
        total: entProfiles.length,
        plannedKm: plannedKm.toFixed(3),
        completedKm: completedKm.toFixed(3),
        percent
      };
    }).sort((a, b) => b.percent - a.percent);

    // Сборка текста в формате Markdown
    let md = `# Аналитический отчет по контролю продольных профилей путей и ТРА станций\n`;
    md += `**Дата анализа:** 07.07.2026 (Расчетная дата контроля системы: \`${formatDate(currentDate)}\`)\n\n`;
    md += `---\n\n`;

    md += `## 📊 1. Сводные показатели программы контроля\n\n`;
    md += `*   **Всего объектов в базе данных:** \`${totalProfiles}\`\n`;
    md += `*   **Категория "Съемка продольных профилей"**: \`${surveyCount}\` объектов\n`;
    md += `    *   *Внесено изменений в ТРА (Завершено):* **${surveyTraCount}**\n`;
    md += `    *   *Профили утверждены:* **${surveyApprovedCount}**\n`;
    md += `    *   *Фактически снято (в стадии согласования):* **${surveyShotCount}**\n`;
    md += `    *   *Запланировано:* **${surveyPlannedCount}**\n`;
    md += `    *   *Общий километраж съемки (План / Выполнено):* **${surveyPlannedKm.toFixed(3)} км** / **${surveyCompletedKm.toFixed(3)} км** (**${surveyPercent}%**)\n`;
    md += `*   **Категория "Выправка путей"**: \`${alignmentCount}\` объектов\n`;
    md += `    *   *Выправка завершена (Утверждена/ТРА):* **${alignmentCompletedCount}**\n`;
    md += `    *   *Фактически выправлено (в стадии проверки):* **${alignmentShotCount}**\n`;
    md += `    *   *Запланировано к выправке:* **${alignmentPlannedCount}**\n`;
    md += `    *   *Объем выправки (План / Выполнено):* **${alignmentPlannedKm.toFixed(3)} км** / **${alignmentCompletedKm.toFixed(3)} км** (**${alignmentPercent}%**)\n\n`;
    md += `---\n\n`;

    md += `## 🚫 2. Нарушения периодичности съемки (КРИТИЧЕСКИЙ ЗАПРЕТ ЗАКРЕПЛЕНИЯ ТБ)\n\n`;
    md += `⚠️ **ВНИМАНИЕ!** Согласно требованиям ПТЭ, на станционных путях с просроченной периодичностью инструментальной съемки продольного профиля (3 года — для сортировочных/сортировочно-отправочных путей, 10 лет — для прочих путей) **ЗАКРЕПЛЕНИЕ СОСТАВОВ ТОРМОЗНЫМИ БАШМАКАМИ КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ!**\n\n`;

    if (activeProhibitions.length === 0) {
      md += `✅ **Нарушений периодичности съемки не выявлено.** На всех станционных путях разрешено закрепление тормозными башмаками.\n\n`;
    } else {
      md += `Выявлено **${activeProhibitions.length}** путей с активным запретом на закрепление ТБ:\n\n`;
      md += `| Станция | № Пути | Специализация пути | Последняя съемка | Срок контроля | Просрочено (лет) |\n`;
      md += `| :--- | :---: | :--- | :---: | :---: | :---: |\n`;
      activeProhibitions.forEach(p => {
        const tb = getTbProhibitionStatus(p, currentDate);
        const prevYear = p.prevSurveyDate ? new Date(p.prevSurveyDate).getFullYear() : 0;
        const currentYear = new Date(currentDate).getFullYear();
        const yearsOverdue = currentYear - prevYear - tb.limitYears;
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        md += `| **${p.station}** | ${p.trackNumber} | *${spec}* | ${formatDate(p.prevSurveyDate)} | ${tb.limitYears} лет | **+${yearsOverdue > 0 ? yearsOverdue : 1} г.** |\n`;
      });
      md += `\n*Необходимо срочно выполнить инструментальную съемку продольного профиля по данным путям и обновить ТРА станций.*\n\n`;
    }
    md += `---\n\n`;

    md += `## ⚠️ 3. Просроченные плановые работы (Запланировано, но не выполнено)\n\n`;
    md += `Объекты, у которых плановый срок выполнения наступил ранее текущей расчетной даты (\`${formatDate(currentDate)}\`), но работы остаются в статусе "Запланировано":\n\n`;

    if (overdueWorks.length === 0) {
      md += `✅ **Просроченных плановых работ нет.** Все текущие задачи укладываются в установленный график.\n\n`;
    } else {
      md += `| Станция | Вид работы | № Пути | Специализация пути | План. срок | Ответственное предприятие |\n`;
      md += `| :--- | :---: | :---: | :--- | :---: | :--- |\n`;
      overdueWorks.forEach(p => {
        const catLabel = p.category === 'alignment' ? 'Выправка' : 'Съемка';
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        md += `| **${p.station}** | ${catLabel} | ${p.trackNumber} | *${spec}* | **${formatDate(p.plannedDate)}** | ${p.enterprise} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    md += `## 📅 4. Предстоящие работы по графику (Ближайшие 15 дней)\n\n`;
    md += `Календарный план работ на ближайшие две недели:\n\n`;

    if (upcomingWorks.length === 0) {
      md += `ℹ️ В ближайшие 15 дней новые работы по съемке и выправке не запланированы.\n\n`;
    } else {
      md += `| Станция | Вид работы | № Пути | Специализация пути | План. дата | Исполнитель |\n`;
      md += `| :--- | :---: | :---: | :--- | :---: | :--- |\n`;
      upcomingWorks.forEach(p => {
        const catLabel = p.category === 'alignment' ? 'Выправка' : 'Съемка';
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        md += `| **${p.station}** | ${catLabel} | ${p.trackNumber} | *${spec}* | ${formatDate(p.plannedDate)} | ${p.enterprise} |\n`;
      });
      md += `\n`;
    }
    md += `---\n\n`;

    md += `## 🏢 5. Статистика выполнения программы выправки по предприятиям\n\n`;
    md += `| Дистанция пути (Предприятие) | Всего объектов | План (км) | Выправлено (км) | Выполнение (%) |\n`;
    md += `| :--- | :---: | :---: | :---: | :---: |\n`;
    enterpriseStats.forEach(ent => {
      md += `| **${ent.name}** | ${ent.total} | ${ent.plannedKm} км | ${ent.completedKm} км | **${ent.percent}%** |\n`;
    });
    md += `\n\n*Отчет сгенерирован автоматически программным комплексом СК-ПРОФИЛИ.*`;

    setReportText(md);
  }, [profiles, currentDate]);

  // Инициализация при изменении списка профилей
  React.useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `profile_analysis_report_${currentDate}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadWord = () => {
    const totalProfiles = profiles.length;
    const surveyProfiles = profiles.filter(p => p.category === 'survey');
    const alignmentProfiles = profiles.filter(p => p.category === 'alignment');

    const surveyCount = surveyProfiles.length;
    const surveyTraCount = surveyProfiles.filter(p => p.status === 'tra_updated').length;
    const surveyApprovedCount = surveyProfiles.filter(p => p.status === 'approved').length;
    const surveyShotCount = surveyProfiles.filter(p => p.status === 'shot').length;
    const surveyPlannedCount = surveyProfiles.filter(p => p.status === 'planned').length;

    const alignmentCount = alignmentProfiles.length;
    const alignmentCompletedCount = alignmentProfiles.filter(p => p.status === 'tra_updated' || p.status === 'approved').length;
    const alignmentShotCount = alignmentProfiles.filter(p => p.status === 'shot').length;
    const alignmentPlannedCount = alignmentProfiles.filter(p => p.status === 'planned').length;

    const alignmentPlannedKm = alignmentProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const alignmentCompletedKm = alignmentProfiles.reduce((sum, p) => sum + (p.completedVolume || 0), 0);
    const alignmentPercent = alignmentPlannedKm > 0 ? Math.round((alignmentCompletedKm / alignmentPlannedKm) * 100) : 0;

    const surveyPlannedKm = surveyProfiles.reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const surveyCompletedKm = surveyProfiles
      .filter(p => p.status === 'tra_updated' || p.status === 'approved')
      .reduce((sum, p) => sum + (p.workVolume || 0), 0);
    const surveyPercent = surveyPlannedKm > 0 ? Math.round((surveyCompletedKm / surveyPlannedKm) * 100) : 0;

    const activeProhibitions = profiles.filter(p => {
      const tb = getTbProhibitionStatus(p, currentDate);
      return tb.isActive;
    });

    const overdueWorks = profiles.filter(p => {
      return p.status === 'planned' && p.plannedDate && p.plannedDate < currentDate;
    });

    const upcomingWorks = profiles.filter(p => {
      if (p.status !== 'planned' || !p.plannedDate) return false;
      const pDate = new Date(p.plannedDate);
      const cDate = new Date(currentDate);
      const diffTime = pDate.getTime() - cDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 15;
    });

    const enterprises = Array.from(new Set(profiles.map(p => p.enterprise || 'Неизвестно')));
    const enterpriseStats = enterprises.map(ent => {
      const entProfiles = profiles.filter(p => p.enterprise === ent);
      const entAlign = entProfiles.filter(p => p.category === 'alignment');
      const plannedKm = entAlign.reduce((sum, p) => sum + (p.workVolume || 0), 0);
      const completedKm = entAlign.reduce((sum, p) => sum + (p.completedVolume || 0), 0);
      const percent = plannedKm > 0 ? Math.round((completedKm / plannedKm) * 100) : 0;
      return {
        name: ent,
        total: entProfiles.length,
        plannedKm: plannedKm.toFixed(3),
        completedKm: completedKm.toFixed(3),
        percent
      };
    }).sort((a, b) => b.percent - a.percent);

    let html = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Аналитический отчет</title>
  <style>
    body {
      font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #333333;
    }
    h1 {
      font-family: 'Calibri Light', 'Segoe UI', Arial, sans-serif;
      font-size: 18pt;
      color: #1f4e79;
      border-bottom: 2px solid #1f4e79;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12pt;
    }
    h2 {
      font-family: 'Calibri Light', 'Segoe UI', Arial, sans-serif;
      font-size: 13pt;
      color: #2e75b6;
      border-left: 4px solid #2e75b6;
      padding-left: 8px;
      margin-top: 20pt;
      margin-bottom: 10pt;
    }
    ul {
      margin-top: 0;
      margin-bottom: 10pt;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4pt;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
    }
    th {
      background-color: #2e75b6;
      color: #ffffff;
      font-weight: bold;
      border: 1px solid #a6a6a6;
      padding: 6px 8px;
      font-size: 10pt;
      text-align: left;
    }
    td {
      border: 1px solid #bfbfbf;
      padding: 6px 8px;
      font-size: 10pt;
      text-align: left;
    }
    tr:nth-child(even) {
      background-color: #f2f7fa;
    }
    .warning-box {
      background-color: #fdf2f2;
      border: 1px solid #f8b4b4;
      border-left: 5px solid #f05252;
      padding: 10px;
      margin: 12pt 0;
      color: #9b1c1c;
    }
    .success-text {
      color: #03543f;
      font-weight: bold;
    }
    .meta-info {
      font-size: 10pt;
      color: #595959;
      margin-bottom: 18pt;
      font-style: italic;
    }
    .accent {
      font-weight: bold;
      color: #1f4e79;
    }
  </style>
</head>
<body>
  <h1>Аналитический отчет по контролю продольных профилей путей и ТРА станций</h1>
  <div class="meta-info">
    <strong>Дата анализа:</strong> 07.07.2026<br/>
    <strong>Расчетная дата контроля системы:</strong> ${formatDate(currentDate)}
  </div>

  <h2>1. Сводные показатели программы контроля</h2>
  <ul>
    <li>Всего объектов в базе данных: <span class="accent">${totalProfiles}</span></li>
    <li><strong>Категория "Съемка продольных профилей"</strong>: ${surveyCount} объектов
      <ul>
        <li>Внесено изменений в ТРА (Завершено): <strong>${surveyTraCount}</strong></li>
        <li>Профили утверждены: <strong>${surveyApprovedCount}</strong></li>
        <li>Фактически снято (в стадии согласования): <strong>${surveyShotCount}</strong></li>
        <li>Запланировано: <strong>${surveyPlannedCount}</strong></li>
        <li>Общий километраж съемки (План / Выполнено): <strong>${surveyPlannedKm.toFixed(3)} км</strong> / <strong>${surveyCompletedKm.toFixed(3)} км</strong> (${surveyPercent}%)</li>
      </ul>
    </li>
    <li><strong>Категория "Выправка путей"</strong>: ${alignmentCount} объектов
      <ul>
        <li>Выправка завершена (Утверждена/ТРА): <strong>${alignmentCompletedCount}</strong></li>
        <li>Фактически выправлено (в стадии проверки): <strong>${alignmentShotCount}</strong></li>
        <li>Запланировано к выправке: <strong>${alignmentPlannedCount}</strong></li>
        <li>Объем выправки (План / Выполнено): <strong>${alignmentPlannedKm.toFixed(3)} км</strong> / <strong>${alignmentCompletedKm.toFixed(3)} км</strong> (${alignmentPercent}%)</li>
      </ul>
    </li>
  </ul>

  <h2>2. Нарушения периодичности съемки (КРИТИЧЕСКИЙ ЗАПРЕТ ЗАКРЕПЛЕНИЯ ТБ)</h2>
  <div class="warning-box">
    <strong>ВНИМАНИЕ!</strong> Согласно требованиям ПТЭ, на станционных путях с просроченной периодичностью инструментальной съемки продольного профиля (3 года — для сортировочных/сортировочно-отправочных путей, 10 лет — для прочих путей) <strong>ЗАКРЕПЛЕНИЕ СОСТАВОВ ТОРМОЗНЫМИ БАШМАКАМИ КАТЕГОРИЧЕСКИ ЗАПРЕЩАЕТСЯ!</strong>
  </div>
`;

    if (activeProhibitions.length === 0) {
      html += `  <p class="success-text">✅ Нарушений периодичности съемки не выявлено. На всех станционных путях разрешено закрепление тормозными башмаками.</p>`;
    } else {
      html += `  <p>Выявлено <strong>${activeProhibitions.length}</strong> путей с активным запретом на закрепление ТБ:</p>
  <table>
    <thead>
      <tr>
        <th>Станция</th>
        <th>№ Пути</th>
        <th>Специализация пути</th>
        <th>Последняя съемка</th>
        <th>Срок контроля</th>
        <th>Просрочено (лет)</th>
      </tr>
    </thead>
    <tbody>`;
      activeProhibitions.forEach(p => {
        const tb = getTbProhibitionStatus(p, currentDate);
        const prevYear = p.prevSurveyDate ? new Date(p.prevSurveyDate).getFullYear() : 0;
        const currentYear = new Date(currentDate).getFullYear();
        const yearsOverdue = currentYear - prevYear - tb.limitYears;
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        html += `
      <tr>
        <td><strong>${p.station}</strong></td>
        <td>${p.trackNumber}</td>
        <td>${spec}</td>
        <td>${formatDate(p.prevSurveyDate)}</td>
        <td>${tb.limitYears} лет</td>
        <td style="color: #b91c1c; font-weight: bold;">+${yearsOverdue > 0 ? yearsOverdue : 1} г.</td>
      </tr>`;
      });
      html += `
    </tbody>
  </table>
  <p style="font-style: italic;">Необходимо срочно выполнить инструментальную съемку продольного профиля по данным путям и обновить ТРА станций.</p>`;
    }

    html += `  <h2>3. Просроченные плановые работы (Запланировано, но не выполнено)</h2>`;
    if (overdueWorks.length === 0) {
      html += `  <p class="success-text">✅ Просроченных плановых работ нет. Все текущие задачи укладываются в установленный график.</p>`;
    } else {
      html += `  <table>
    <thead>
      <tr>
        <th>Станция</th>
        <th>Вид работы</th>
        <th>№ Пути</th>
        <th>Специализация пути</th>
        <th>План. срок</th>
        <th>Ответственное предприятие</th>
      </tr>
    </thead>
    <tbody>`;
      overdueWorks.forEach(p => {
        const catLabel = p.category === 'alignment' ? 'Выправка' : 'Съемка';
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        html += `
      <tr>
        <td><strong>${p.station}</strong></td>
        <td>${catLabel}</td>
        <td>${p.trackNumber}</td>
        <td>${spec}</td>
        <td style="color: #b91c1c; font-weight: bold;">${formatDate(p.plannedDate)}</td>
        <td>${p.enterprise}</td>
      </tr>`;
      });
      html += `
    </tbody>
  </table>`;
    }

    html += `  <h2>4. Предстоящие работы по графику (Ближайшие 15 дней)</h2>`;
    if (upcomingWorks.length === 0) {
      html += `  <p>В ближайшие 15 дней новые работы по съемке и выправке не запланированы.</p>`;
    } else {
      html += `  <table>
    <thead>
      <tr>
        <th>Станция</th>
        <th>Вид работы</th>
        <th>№ Пути</th>
        <th>Специализация пути</th>
        <th>План. дата</th>
        <th>Исполнитель</th>
      </tr>
    </thead>
    <tbody>`;
      upcomingWorks.forEach(p => {
        const catLabel = p.category === 'alignment' ? 'Выправка' : 'Съемка';
        const spec = p.trackSpecialization || (p.trackType === 'main' ? 'Главный' : p.trackType === 'station' ? 'Приемо-отправочный' : 'Прочий');
        html += `
      <tr>
        <td><strong>${p.station}</strong></td>
        <td>${catLabel}</td>
        <td>${p.trackNumber}</td>
        <td>${spec}</td>
        <td>${formatDate(p.plannedDate)}</td>
        <td>${p.enterprise}</td>
      </tr>`;
      });
      html += `
    </tbody>
  </table>`;
    }

    html += `  <h2>5. Статистика выполнения программы выправки по предприятиям</h2>
  <table>
    <thead>
      <tr>
        <th>Дистанция пути (Предприятие)</th>
        <th>Всего объектов</th>
        <th>План (км)</th>
        <th>Выправлено (км)</th>
        <th>Выполнение (%)</th>
      </tr>
    </thead>
    <tbody>`;
    enterpriseStats.forEach(ent => {
      html += `
      <tr>
        <td><strong>${ent.name}</strong></td>
        <td>${ent.total}</td>
        <td>${ent.plannedKm} км</td>
        <td>${ent.completedKm} км</td>
        <td><strong>${ent.percent}%</strong></td>
      </tr>`;
    });
    html += `
    </tbody>
  </table>
  <p style="font-size: 9pt; color: #7f7f7f; margin-top: 30pt;">Отчет сгенерирован автоматически программным комплексом СК-ПРОФИЛИ.</p>
</body>
</html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `profile_analysis_report_${currentDate}.doc`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="markdown-report-container" className="space-y-6">
      
      {/* Шапка аналитического модуля */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 shrink-0 pointer-events-none">
          <FileText className="w-48 h-48" />
        </div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/30 text-blue-100 text-xs font-bold uppercase tracking-wider">
            <BadgeInfo className="w-3.5 h-3.5" />
            <span>Анализ программы</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Инструментальный Анализ Съемки и Выправки</h2>
          <p className="text-blue-100 text-sm max-w-2xl leading-relaxed">
            Генерирует структурированные отчеты по состоянию продольных профилей, выправке километров путей, нарушениям периодичности съемки и ТБ-запретам для дальнейшей вставки в документы или ТРА.
          </p>
        </div>
      </div>

      {/* Панель инструментов */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
        {/* Описание режима */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          <Eye className="w-4 h-4 text-blue-600" />
          <span>Визуальный просмотр отчета</span>
        </div>

        {/* Действия */}
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            title="Обновить отчет на основе текущей базы данных"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Обновить</span>
          </button>

          <button
            onClick={handleCopy}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              copied 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Clipboard className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>

          <button
            onClick={handleDownloadWord}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Экспортировать аналитический отчет в Microsoft Word"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Экспорт в Word (.doc)</span>
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-xs overflow-hidden">
        <div className="p-6 md:p-8 overflow-x-auto">
          {/* Темы оформления отчета для предпросмотра */}
          <div className="markdown-body text-slate-800 leading-relaxed max-w-none prose prose-slate">
            <ReactMarkdown 
              components={{
                h1: ({node, ...props}) => <h1 className="text-2xl font-black text-slate-900 border-b border-slate-200 pb-3 mb-5 mt-2 tracking-tight" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-extrabold text-slate-800 mt-8 mb-4 border-l-4 border-blue-600 pl-3 tracking-tight" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-base font-bold text-slate-800 mt-6 mb-2" {...props} />,
                p: ({node, ...props}) => <p className="text-sm text-slate-600 mb-4" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-600 mb-4" {...props} />,
                li: ({node, ...props}) => <li className="mb-1" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-slate-900" {...props} />,
                code: ({node, ...props}) => <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs text-rose-600 border border-slate-200/40" {...props} />,
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-6 border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-sm border-collapse" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider" {...props} />,
                tbody: ({node, ...props}) => <tbody className="divide-y divide-slate-100 text-slate-700" {...props} />,
                tr: ({node, ...props}) => <tr className="hover:bg-slate-50/50 transition-colors" {...props} />,
                th: ({node, ...props}) => <th className="px-4 py-3 font-bold text-slate-600" {...props} />,
                td: ({node, ...props}) => <td className="px-4 py-3" {...props} />
              }}
            >
              {reportText}
            </ReactMarkdown>
          </div>
        </div>
      </div>

    </div>
  );
};
