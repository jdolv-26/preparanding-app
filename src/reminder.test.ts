import { expect, test } from 'vitest';
import { googleCalendarUrl, ics } from './reminder.ts';

const url = 'https://example.org/app/';

test('el recordatorio empieza hoy si la hora no ha pasado, si no mañana', () => {
  const morning = new Date(2026, 10, 23, 9, 0);
  expect(ics('20:00', url, morning)).toContain('DTSTART:20261123T200000');
  const night = new Date(2026, 10, 23, 21, 0);
  const s = ics('20:00', url, night);
  expect(s).toContain('DTSTART:20261124T200000');
  expect(s).toContain('DTEND:20261124T201000');
  expect(s).toContain('RRULE:FREQ=DAILY');
  expect(s.split('\r\n').at(-1)).toBe('');
});

test('el cambio de mes y el link de Google Calendar', () => {
  const g = new URL(googleCalendarUrl('07:30', url, new Date(2026, 10, 30, 8, 0)));
  expect(g.searchParams.get('dates')).toBe('20261201T073000/20261201T074000');
  expect(g.searchParams.get('recur')).toBe('RRULE:FREQ=DAILY');
});
