import {
  addDays,
  eachDayOfInterval,
  format,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getYear,
  isSameMonth,
  isValid,
  parse,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import {
  hallDateTimeFormat,
  parseHallDateTime,
  toLocalDateTimeValue,
} from "@/lib/format";

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

function partsFromDate(date: Date): DateTimeParts {
  return {
    year: getYear(date),
    month: getMonth(date) + 1,
    day: getDate(date),
    hour: getHours(date),
    minute: getMinutes(date),
  };
}

export function splitDateTime(value: string): DateTimeParts {
  const parsed = parse(value, hallDateTimeFormat, new Date());
  if (!isValid(parsed)) return splitDateTime(toLocalDateTimeValue());
  return partsFromDate(parsed);
}

export function joinDateTime(parts: DateTimeParts) {
  return format(
    new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute),
    hallDateTimeFormat,
  );
}

export function shiftDate(parts: DateTimeParts, days: number) {
  const next = addDays(
    new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute),
    days,
  );
  return { ...parts, ...partsFromDate(next) };
}

export function monthCells(year: number, month: number): CalendarCell[] {
  const monthDate = new Date(year, month - 1, 1);
  const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 41) }).map((date) => ({
    year: getYear(date),
    month: getMonth(date) + 1,
    day: getDate(date),
    inMonth: isSameMonth(date, monthDate),
  }));
}

export function weekdayLabels(locale: string) {
  const monday = new Date(2021, 5, 7);
  return eachDayOfInterval({ start: monday, end: addDays(monday, 6) }).map(
    (date) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date),
  );
}

export function addDaysToDateTime(value: string, days: number) {
  return format(addDays(parseHallDateTime(value), days), hallDateTimeFormat);
}

export function sameDay(
  left: Pick<DateTimeParts, "year" | "month" | "day">,
  right: Pick<DateTimeParts, "year" | "month" | "day">,
) {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}
