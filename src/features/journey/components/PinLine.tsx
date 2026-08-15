"use client";

import { useI18n } from "@/i18n/provider";
import type { SelectedPlace } from "@/lib/transit/types";
import {
  pinnedOnRoute,
  type PinnedRole,
  type PinnedSearch,
} from "../lib/pinned";

const ROLES: PinnedRole[] = ["home", "work", "line"];

export function PinLine({
  from,
  to,
  via,
  pins,
  onPin,
  onUnpin,
}: {
  from: SelectedPlace;
  to: SelectedPlace;
  via: SelectedPlace[];
  pins: PinnedSearch[];
  onPin: (role: PinnedRole) => void;
  onUnpin: (role: PinnedRole) => void;
}) {
  const { t } = useI18n();
  const current = pinnedOnRoute(pins, { from, to, via });

  return (
    <div data-testid="pin-line">
      <p className="kicker mb-2">{t("search.pinLine")}</p>
      <div className="ticket-line-row" role="group" aria-label={t("search.pinLine")}>
        {ROLES.map((role) => {
          const on = current?.role === role;
          return (
            <button
              key={role}
              type="button"
              className="stamp"
              data-on={on}
              data-testid={`pin-${role}`}
              aria-pressed={on}
              onClick={() => (on ? onUnpin(role) : onPin(role))}
            >
              {role === "home"
                ? t("search.pinnedHome")
                : role === "work"
                  ? t("search.pinnedWork")
                  : t("search.pinnedOther")}
            </button>
          );
        })}
      </div>
      {current ? (
        <button
          type="button"
          className="search-clear mt-2 text-left"
          data-testid="unpin-line"
          onClick={() => onUnpin(current.role)}
        >
          {t("search.unpinLine")}
        </button>
      ) : null}
    </div>
  );
}
