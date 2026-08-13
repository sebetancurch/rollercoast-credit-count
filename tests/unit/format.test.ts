import { describe, expect, it } from "vitest";

import { formatDate, formatDateLong, plural, todayIso } from "@/lib/format";

describe("formatDate", () => {
  it("renders the short broadsheet form", () => {
    expect(formatDate("2023-05-20")).toBe("20 May 2023");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDate("2024-12-31")).toBe("31 Dec 2024");
  });

  it("drops the leading zero on the day", () => {
    expect(formatDate("2025-06-08")).toBe("8 Jun 2025");
  });

  it("returns the input unchanged when it cannot be parsed", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate("not-a-date")).toBe("not-a-date");
    expect(formatDate("2026-13-01")).toBe("2026-13-01");
  });
});

describe("formatDateLong", () => {
  it("spells the month out", () => {
    expect(formatDateLong("2026-08-13")).toBe("13 August 2026");
    expect(formatDateLong("2023-09-02")).toBe("2 September 2023");
  });
});

describe("todayIso", () => {
  it("formats a fixed date as yyyy-mm-dd", () => {
    // Local-time constructor on purpose: the date input must show the user's
    // day, not UTC's.
    expect(todayIso(new Date(2026, 7, 13))).toBe("2026-08-13");
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through formatDate", () => {
    expect(formatDate(todayIso(new Date(2026, 7, 13)))).toBe("13 Aug 2026");
  });
});

describe("plural", () => {
  it("uses the singular for exactly one", () => {
    expect(plural(1, "ride")).toBe("1 ride");
    expect(plural(0, "ride")).toBe("0 rides");
    expect(plural(62, "ride")).toBe("62 rides");
  });

  it("takes an explicit plural when the default would be wrong", () => {
    expect(plural(2, "country", "countries")).toBe("2 countries");
  });
});
