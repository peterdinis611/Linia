import { toLocalDateTimeValue } from "@/lib/format";

export type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export type CalendarCell = {
  year: number;
  month: number;
  day: number;
  inMonth: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

export function splitDateTime(value: string): DateTimeParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return splitDateTime(toLocalDateTimeValue());
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
}

export function joinDateTime(parts: DateTimeParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function shiftDate(parts: DateTimeParts, days: number) {
  const date = new Date(parts.year, parts.month - 1, parts.day + days);
  return {
    ...parts,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function monthCells(year: number, month: number): CalendarCell[] {
  const start = new Date(year, month - 1, 1);
  const weekday = (start.getDay() + 6) % 7;
  const cursor = new Date(year, month - 1, 1 - weekday);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(cursor);
    date.setDate(cursor.getDate() + index);
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      inMonth: date.getMonth() + 1 === month,
    };
  });
}

export function weekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
      new Date(2021, 5, 7 + index),
    ),
  );
}

export function sameDay(
  left: Pick<DateTimeParts, "year" | "month" | "day">,
  right: Pick<DateTimeParts, "year" | "month" | "day">,
) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}
