import { describe, expect, it } from "vitest";
import { berlin, prague } from "@/test/fixtures";
import {
  fieldErrorsFromZod,
  journeySearchFormSchema,
} from "@/lib/schemas";

const base = {
  from: berlin,
  to: prague,
  via: [],
  time: "2026-08-14T08:30",
  leaveNow: true,
  arriveBy: false,
  allDay: false,
  modeFilter: "all" as const,
  transferFilter: "all" as const,
};

describe("journeySearchFormSchema", () => {
  it("accepts a point-to-point ticket", () => {
    expect(journeySearchFormSchema.safeParse(base).success).toBe(true);
  });

  it("lets the station board skip a destination", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
      board: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("still needs an origin on the station board", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      from: null,
      to: null,
      board: true,
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromZod(parsed.error!).from).toBe("validation.originRequired");
  });

  it("needs a destination unless the board is stamped", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromZod(parsed.error!).to).toBe(
      "validation.destinationRequired",
    );
  });

  it("needs a return stamp time", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      wantReturn: true,
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromZod(parsed.error!).returnTime).toBe(
      "validation.returnTimeRequired",
    );
  });

  it("rejects a return that leaves before the outbound", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      leaveNow: false,
      time: "2026-08-16T10:00",
      wantReturn: true,
      returnTime: "2026-08-15T08:00",
    });
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromZod(parsed.error!).returnTime).toBe(
      "validation.returnAfterOutbound",
    );
  });

  it("accepts a return after the outbound", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      leaveNow: false,
      wantReturn: true,
      returnTime: "2026-08-16T14:00",
      accessible: true,
    });
    expect(parsed.success).toBe(true);
  });

  it("ignores a missing return time on the station board", () => {
    const parsed = journeySearchFormSchema.safeParse({
      ...base,
      to: null,
      board: true,
      wantReturn: true,
    });
    expect(parsed.success).toBe(true);
  });
});
