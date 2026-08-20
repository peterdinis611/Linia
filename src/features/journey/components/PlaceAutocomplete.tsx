"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { useI18n } from "@/i18n/provider";
import { localizePlaceName } from "@/i18n/place-name";
import { matchToPlace } from "@/lib/transit/place";
import { searchPlaces } from "@/lib/transit/queries";
import { geocodeInputSchema } from "@/lib/schemas";
import { stopModeKind } from "@/lib/transit/geocode-rank";
import { areaLabel, type GeocodeMatch, type SelectedPlace } from "@/lib/transit/types";

const COMMIT_FIELDS = "linia-commit-fields";

type PlaceAutocompleteProps = {
  label: string;
  placeholder: string;
  value: SelectedPlace | null;
  error?: string;
  bias?: { lat: number; lon: number } | null;
  onChange: (place: SelectedPlace | null) => void;
};

export function PlaceAutocomplete({
  label,
  placeholder,
  value,
  error,
  bias,
  onChange,
}: PlaceAutocompleteProps) {
  const { locale, messages, t } = useI18n();
  const id = useId();
  const errorId = `${id}-error`;
  const geocodeErrorId = `${id}-geocode-error`;
  const rootRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [draft, setDraft] = useState(value?.name ?? "");
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeocodeMatch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fetchError, setFetchError] = useState(false);
  const [listPos, setListPos] = useState({ top: 0, left: 0, width: 0, maxHeight: 272 });

  const query = value && !editing ? value.name : draft;
  const canClear = query.trim().length > 0;
  const showList =
    editing && open && draft.trim().length >= 2 && results.length > 0;
  const emptyList =
    editing &&
    !loading &&
    !fetchError &&
    draft.trim().length >= 2 &&
    results.length === 0;

  useEffect(() => {
    if (value) {
      if (!editing) setDraft(value.name);
      return;
    }
    if (!editing) {
      setOpen(false);
    }
  }, [value, editing]);

  useEffect(() => {
    if (!editing) return;
    const parsed = geocodeInputSchema.safeParse({
      query: draft,
      language: locale,
    });
    if (!parsed.success) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      setFetchError(false);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const matches = await searchPlaces(
          parsed.data.query,
          parsed.data.language ?? locale,
          bias,
        );
        if (controller.signal.aborted) return;
        setResults(matches);
        setActiveIndex(0);
        setFetchError(false);
        setOpen(matches.length > 0);
      } catch {
        if (controller.signal.aborted) return;
        setResults([]);
        setOpen(false);
        setFetchError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [bias?.lat, bias?.lon, draft, editing, locale]);

  useEffect(() => {
    if (!showList && !value) return;
    window.dispatchEvent(new Event("linia-tour-fit"));
  }, [showList, value]);

  useLayoutEffect(() => {
    if (!showList) return;
    function placeList() {
      const field = fieldRef.current;
      if (!field) return;
      const rect = field.getBoundingClientRect();
      const cta = document.querySelector(".search-cta");
      const ctaTop = cta?.getBoundingClientRect().top ?? window.innerHeight;
      const below = Math.min(ctaTop, window.innerHeight) - rect.bottom - 8;
      const above = rect.top - 8;
      const openUp = below < 160 && above > below;
      const room = Math.max(0, openUp ? above : below);
      const maxHeight = Math.min(272, Math.max(96, room));
      setListPos({
        top: openUp ? rect.top - 4 - maxHeight : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    }
    placeList();
    window.addEventListener("resize", placeList);
    window.addEventListener("scroll", placeList, true);
    return () => {
      window.removeEventListener("resize", placeList);
      window.removeEventListener("scroll", placeList, true);
    };
  }, [showList, results.length]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const node = event.target as Node;
      if (rootRef.current?.contains(node)) return;
      if (listRef.current?.contains(node)) return;
      setOpen(false);
      setEditing(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function selectMatch(match: GeocodeMatch) {
    const place = matchToPlace(match, messages.placeKind);
    onChange(place);
    setDraft(place.name);
    setEditing(false);
    setOpen(false);
  }

  useEffect(() => {
    function commit() {
      if (value) return;
      const match = results[activeIndex] ?? results[0];
      if (!match || draft.trim().length < 2) return;
      flushSync(() => {
        selectMatch(match);
      });
    }
    window.addEventListener(COMMIT_FIELDS, commit);
    return () => window.removeEventListener(COMMIT_FIELDS, commit);
  }, [activeIndex, draft, results, value]);

  function clearField() {
    setDraft("");
    setEditing(false);
    setOpen(false);
    setResults([]);
    setLoading(false);
    setFetchError(false);
    onChange(null);
  }

  const unmatched = !value && draft.trim().length > 0 && !loading && !fetchError && !editing;
  const pickHint = unmatched
    ? t("search.pickFromList")
    : emptyList
      ? t("search.noPlaces")
      : undefined;
  const shownError = error
    ? unmatched || emptyList
      ? pickHint
      : error
    : pickHint;
  const describedBy = [
    shownError ? errorId : null,
    fetchError ? geocodeErrorId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div ref={rootRef} className="relative">
      <label htmlFor={id} className="kicker mb-2 block">
        {label}
      </label>
      <div ref={fieldRef} className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          aria-invalid={Boolean(shownError || fetchError)}
          aria-describedby={describedBy || undefined}
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setEditing(true);
            setDraft(event.target.value);
            if (value) onChange(null);
          }}
          onFocus={() => {
            setEditing(true);
            setDraft(value?.name ?? draft);
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              if (showList) {
                setOpen(false);
                return;
              }
              if (canClear) clearField();
              return;
            }
            if (!showList) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex(
                (index) => (index - 1 + results.length) % results.length,
              );
            } else if (event.key === "Enter") {
              event.preventDefault();
              selectMatch(results[activeIndex]);
            }
          }}
          className={
            canClear && loading ? "field pr-16" : canClear || loading ? "field pr-10" : "field"
          }
        />
        {loading && (
          <span
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 spin rounded-full border-2 border-rule-strong border-t-signal ${
              canClear ? "right-10" : "right-3"
            }`}
          />
        )}
        {canClear && (
          <button
            type="button"
            className="field-clear"
            aria-label={t("search.clearField", { name: label })}
            onClick={clearField}
          >
            <ClearIcon />
          </button>
        )}
      </div>
      {shownError ? (
        <p id={errorId} role="alert" className="field-error">
          {shownError}
        </p>
      ) : fetchError ? (
        <p id={geocodeErrorId} role="alert" className="field-error" data-testid="geocode-failed">
          {t("search.geocodeFailed")}
        </p>
      ) : value?.area && !editing ? (
        <p className="mt-1.5 truncate font-mono text-[11px] tracking-wide text-ink-muted">
          {value.area}
        </p>
      ) : null}
      {showList
        ? createPortal(
            <ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              className="suggest"
              style={{
                position: "fixed",
                top: listPos.top,
                left: listPos.left,
                width: listPos.width,
                maxHeight: listPos.maxHeight,
                zIndex: 900,
              }}
            >
              {results.map((match, index) => {
                const subtitle = areaLabel(match.areas);
                return (
                  <li key={`${match.id}-${match.lat}-${match.lon}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === activeIndex}
                      className="suggest-item flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm"
                      onMouseEnter={() => setActiveIndex(index)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        selectMatch(match);
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        selectMatch(match);
                      }}
                    >
                      <span
                        className={`mt-0.5 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wider uppercase ${
                          match.type === "STOP" ? "badge-stop" : "badge-place"
                        }`}
                      >
                        {matchBadge(match, t)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {localizePlaceName(match.name, messages.placeKind)}
                        </span>
                        {subtitle && (
                          <span className="suggest-sub mt-0.5 block truncate text-xs text-ink-muted">
                            {subtitle}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}

function matchBadge(
  match: GeocodeMatch,
  t: (key: string) => string,
) {
  if (match.type === "ADDRESS") return t("placeType.ADDRESS");
  if (match.type === "PLACE") return t("placeType.PLACE");
  const kind = stopModeKind(match);
  if (kind === "bus") return t("placeType.BUS");
  if (kind === "rail") return t("placeType.RAIL");
  return t("placeType.STOP");
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
