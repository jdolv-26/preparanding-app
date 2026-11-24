// Recordatorio diario como evento de calendario (sin servidor de push).
// La hora es local: .ics con hora "flotante" (sin zona) y Google Calendar con ctz.

const TITLE = 'Preparanding · 3 minutos';
const pad = (n: number) => String(n).padStart(2, '0');

// Primer evento: hoy a esa hora si aún no pasa, si no mañana. Formato YYYYMMDDTHHMMSS.
function stamps(hhmm: string, now: Date, minutes = 10): [string, string] {
  const [hh, mm] = hhmm.split(':').map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
  if (start <= now) start.setDate(start.getDate() + 1);
  const end = new Date(start.getTime() + minutes * 60_000);
  const f = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  return [f(start), f(end)];
}

export function ics(hhmm: string, url: string, now = new Date()): string {
  const [start, end] = stamps(hhmm, now);
  const utc = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Preparanding//ES', 'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT', `UID:recordatorio-${utc}@preparanding`, `DTSTAMP:${utc}`,
    `DTSTART:${start}`, `DTEND:${end}`, 'RRULE:FREQ=DAILY',
    `SUMMARY:${TITLE}`, `URL:${url}`, `DESCRIPTION:Abre ${url} · basta una sesión corta para que cuente el día.`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${TITLE}`, 'TRIGGER:PT0M', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}

export function googleCalendarUrl(hhmm: string, url: string, now = new Date()): string {
  const [start, end] = stamps(hhmm, now);
  const q = new URLSearchParams({
    action: 'TEMPLATE', text: TITLE, dates: `${start}/${end}`, recur: 'RRULE:FREQ=DAILY',
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    details: `Abre ${url} · basta una sesión corta para que cuente el día.`,
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}
