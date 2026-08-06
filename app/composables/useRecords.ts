import days from '~/data/days.json';
import stops from '~/data/stops.json';
import roster from '~/data/roster.json';
import strength from '~/data/strength.json';
import phases from '~/data/phases.json';
import summary from '~/data/summary.json';

export interface PersonnelLine { serial: string; name: string; grade: string; action: string }
export interface Day {
  date: string;
  station: string;
  place: { name: string; country: string; lat: number; lon: number } | null;
  events: string;
  personnel: PersonnelLine[];
  emDuty: number | null;
  emTotal: number | null;
  pages: number[];
  phase: string;
  notable: boolean;
}
export interface Stop {
  name: string; country: string; lat: number; lon: number;
  station: string; from: string; to: string; days: number; phase: string;
}
export interface RosterMan {
  name: string; serial: string | null; grades: string[]; count: number;
  fate: 'killed' | 'wounded' | null;
  entries: { date: string; grade: string | null; action: string; station: string }[];
}
export interface Phase { id: string; label: string; from: string; to: string; blurb: string }

export const useRecords = () => ({
  days: days as Day[],
  stops: stops as Stop[],
  roster: roster as RosterMan[],
  strength: strength as { date: string; duty: number; total: number; phase: string }[],
  phases: phases as Phase[],
  summary: summary as {
    reportCount: number; firstDate: string; lastDate: string; stopCount: number;
    countries: string[]; landCountries: string[]; namedMen: number; casualties: number; recordedRoadMiles: number;
    pagesTranscribed: number; pagesTotal: number; daysInEurope: number;
  },
});

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export const fmtShort = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]!.slice(0, 3)} ${String(y).slice(2)}`;
};
