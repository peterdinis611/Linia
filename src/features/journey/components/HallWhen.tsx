"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover } from "radix-ui";
import { useI18n } from "@/i18n/provider";
import {
  joinDateTime,
  monthCells,
  sameDay,
  shiftDate,
  splitDateTime,
  weekdayLabels,
  type DateTimeParts,
} from "../lib/datetime";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

type HallWhenProps = {
  datetime: string;
  leaveNow: boolean;
  allDay?: boolean;
  invalid?: boolean;
  describedBy?: string;
  idPrefix?: string;
  onChange: (value: string) => void;
};

export function HallWhen({
  datetime,
  leaveNow,
  allDay = false,
  invalid = false,
  describedBy,
  idPrefix = "journey",
  onChange,
}: HallWhenProps) {
  const { locale, t } = useI18n();
  const parts = splitDateTime(datetime);
  const [open, setOpen] = useState<"date" | "time" | null>(null);
  const [view, setView] = useState({ year: parts.year, month: parts.month });

  useEffect(() => {
    if (open !== "date") {
      setView({ year: parts.year, month: parts.month });
    }
  }, [open, parts.month, parts.year]);

  useEffect(() => {
    if (allDay && open === "time") setOpen(null);
  }, [allDay, open]);

  function commit(next: DateTimeParts) {
    onChange(joinDateTime(next));
  }

  function openPane(pane: "date" | "time") {
    if (leaveNow) onChange(datetime);
    setOpen(pane);
  }

  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    new Date(parts.year, parts.month - 1, parts.day),
  );
  const monthShort = new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(parts.year, parts.month - 1, 1),
  );
  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  }).format(new Date(view.year, view.month - 1, 1));
  const timeLabel = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;

  return (
    <div className="hall-when" data-day={allDay}>
      <Popover.Root
        open={open === "date"}
        onOpenChange={(next) => (next ? openPane("date") : setOpen(null))}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            id={`${idPrefix}-date`}
            data-testid={`${idPrefix}-date`}
            className="hall-when-date"
            aria-label={t("search.date")}
            aria-invalid={invalid}
          >
            <span className="kicker">{weekday}</span>
            <span className="hall-when-date-line">
              <span className="hall-when-day">{parts.day}</span>
              <span>
                {monthShort} {parts.year}
              </span>
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="hall-cal"
            align="start"
            sideOffset={6}
            collisionPadding={12}
          >
            <CalendarSheet
              locale={locale}
              title={monthTitle}
              view={view}
              selected={parts}
              prevLabel={t("search.prevMonth")}
              nextLabel={t("search.nextMonth")}
              todayLabel={t("search.today")}
              onView={setView}
              onSelect={(cell) => {
                commit({ ...parts, ...cell });
                setOpen(null);
              }}
              onToday={() => {
                const now = new Date();
                commit({
                  ...parts,
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                  day: now.getDate(),
                });
                setOpen(null);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {!allDay ? (
      <Popover.Root
        open={open === "time"}
        onOpenChange={(next) => (next ? openPane("time") : setOpen(null))}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            id={`${idPrefix}-time`}
            data-testid={`${idPrefix}-time`}
            className="hall-when-time"
            aria-label={t("search.time")}
            aria-invalid={invalid}
            aria-describedby={describedBy}
          >
            <span className="kicker">{t("search.time")}</span>
            <span className="hall-when-time-value">{timeLabel}</span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="hall-clock"
            align="end"
            sideOffset={6}
            collisionPadding={12}
          >
            <ClockSheet
              hour={parts.hour}
              minute={parts.minute}
              hourLabel={t("search.hour")}
              minuteLabel={t("search.minute")}
              onHour={(hour) => commit({ ...parts, hour })}
              onMinute={(minute) => {
                commit({ ...parts, minute });
                setOpen(null);
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      ) : null}
    </div>
  );
}

function CalendarSheet({
  locale,
  title,
  view,
  selected,
  prevLabel,
  nextLabel,
  todayLabel,
  onView,
  onSelect,
  onToday,
}: {
  locale: string;
  title: string;
  view: { year: number; month: number };
  selected: DateTimeParts;
  prevLabel: string;
  nextLabel: string;
  todayLabel: string;
  onView: (view: { year: number; month: number }) => void;
  onSelect: (cell: { year: number; month: number; day: number }) => void;
  onToday: () => void;
}) {
  const today = new Date();
  const todayCell = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
  const [cursor, setCursor] = useState({
    year: selected.year,
    month: selected.month,
    day: selected.day,
  });
  const cells = monthCells(view.year, view.month);

  function moveView(delta: number) {
    const date = new Date(view.year, view.month - 1 + delta, 1);
    onView({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  function moveCursor(days: number) {
    const next = shiftDate({ ...selected, ...cursor }, days);
    setCursor(next);
    onView({ year: next.year, month: next.month });
  }

  return (
    <div
      role="dialog"
      aria-label={title}
      data-testid="hall-cal"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveCursor(-1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          moveCursor(1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          moveCursor(-7);
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          moveCursor(7);
        } else if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(cursor);
        } else if (event.key === "PageUp") {
          event.preventDefault();
          moveView(-1);
        } else if (event.key === "PageDown") {
          event.preventDefault();
          moveView(1);
        }
      }}
    >
      <div className="hall-cal-nav">
        <button type="button" className="hall-cal-nav-btn" aria-label={prevLabel} onClick={() => moveView(-1)}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <p className="hall-cal-title">{title}</p>
        <button type="button" className="hall-cal-nav-btn" aria-label={nextLabel} onClick={() => moveView(1)}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="hall-cal-week">
        {weekdayLabels(locale).map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="hall-cal-grid">
        {cells.map((cell) => {
          const selectedDay = sameDay(cell, selected);
          const todayDay = sameDay(cell, todayCell);
          const focused = sameDay(cell, cursor);
          return (
            <button
              key={`${cell.year}-${cell.month}-${cell.day}`}
              type="button"
              className="hall-cal-day"
              data-on={selectedDay}
              data-today={todayDay}
              data-muted={!cell.inMonth}
              data-testid={`hall-cal-day-${cell.year}-${String(cell.month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`}
              tabIndex={focused ? 0 : -1}
              aria-current={todayDay ? "date" : undefined}
              aria-selected={selectedDay}
              onClick={() => onSelect(cell)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <button type="button" className="stamp hall-cal-today" data-testid="hall-cal-today" onClick={onToday}>
        {todayLabel}
      </button>
    </div>
  );
}

function ClockSheet({
  hour,
  minute,
  hourLabel,
  minuteLabel,
  onHour,
  onMinute,
}: {
  hour: number;
  minute: number;
  hourLabel: string;
  minuteLabel: string;
  onHour: (hour: number) => void;
  onMinute: (minute: number) => void;
}) {
  const hourRef = useRef<HTMLButtonElement>(null);
  const minuteRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const hourEl = hourRef.current;
    const minuteEl = minuteRef.current;
    const hourList = hourEl?.parentElement;
    const minuteList = minuteEl?.parentElement;
    if (hourEl && hourList) {
      hourList.scrollTop = hourEl.offsetTop - hourList.clientHeight / 2 + hourEl.offsetHeight / 2;
    }
    if (minuteEl && minuteList) {
      minuteList.scrollTop =
        minuteEl.offsetTop - minuteList.clientHeight / 2 + minuteEl.offsetHeight / 2;
    }
  }, [hour, minute]);

  return (
    <div className="hall-clock-board" data-testid="hall-clock">
      <ClockColumn
        label={hourLabel}
        values={HOURS}
        selected={hour}
        selectedRef={hourRef}
        testId="hall-clock-hour"
        onPick={onHour}
      />
      <span className="hall-clock-colon" aria-hidden="true">
        :
      </span>
      <ClockColumn
        label={minuteLabel}
        values={MINUTES}
        selected={minute}
        selectedRef={minuteRef}
        testId="hall-clock-minute"
        onPick={onMinute}
      />
    </div>
  );
}

function ClockColumn({
  label,
  values,
  selected,
  selectedRef,
  testId,
  onPick,
}: {
  label: string;
  values: number[];
  selected: number;
  selectedRef: RefObject<HTMLButtonElement | null>;
  testId: string;
  onPick: (value: number) => void;
}) {
  return (
    <div className="hall-clock-col">
      <p className="kicker">{label}</p>
      <div className="hall-clock-list" role="listbox" aria-label={label} aria-activedescendant={`${testId}-${selected}`}>
        {values.map((value) => {
          const on = value === selected;
          return (
            <button
              key={value}
              type="button"
              id={`${testId}-${value}`}
              ref={on ? selectedRef : undefined}
              role="option"
              aria-selected={on}
              data-on={on}
              data-testid={`${testId}-${String(value).padStart(2, "0")}`}
              className="hall-clock-item"
              onClick={() => onPick(value)}
            >
              {String(value).padStart(2, "0")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
