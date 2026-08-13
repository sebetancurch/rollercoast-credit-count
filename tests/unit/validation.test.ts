import { describe, expect, it } from "vitest";

import {
  coasterSchema,
  fieldErrors,
  logRideSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation";

describe("signUpSchema", () => {
  it("accepts a complete sign-up", () => {
    const result = signUpSchema.safeParse({
      displayName: "Cass Ferreira",
      email: "cass@example.com",
      password: "airtime-forever",
    });
    expect(result.success).toBe(true);
  });

  it("reports every invalid field at once, in the design's own words", () => {
    const result = signUpSchema.safeParse({ displayName: "  ", email: "nope", password: "short" });
    expect(result.success).toBe(false);

    const errors = fieldErrors(result.error!);
    expect(errors).toEqual({
      displayName: "Pick a display name — this is what the leaderboard would show.",
      email: "Enter a valid email address.",
      password: "At least 8 characters.",
    });
  });

  it("accepts a password of exactly eight characters", () => {
    const result = signUpSchema.safeParse({
      displayName: "Cass",
      email: "cass@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });
});

describe("signInSchema", () => {
  it("does not ask for a display name", () => {
    const result = signInSchema.safeParse({ email: "cass@example.com", password: "12345678" });
    expect(result.success).toBe(true);
  });
});

describe("logRideSchema", () => {
  it("accepts a coaster, a date and no note", () => {
    const result = logRideSchema.safeParse({ coasterId: "nemesis", riddenOn: "2026-06-13" });
    expect(result.success).toBe(true);
    expect(result.data?.note).toBeNull();
  });

  it("normalises an empty note to null", () => {
    const result = logRideSchema.safeParse({
      coasterId: "nemesis",
      riddenOn: "2026-06-13",
      note: "   ",
    });
    expect(result.data?.note).toBeNull();
  });

  it("trims a real note", () => {
    const result = logRideSchema.safeParse({
      coasterId: "nemesis",
      riddenOn: "2026-06-13",
      note: "  Row four. Still the best.  ",
    });
    expect(result.data?.note).toBe("Row four. Still the best.");
  });

  it("rejects a malformed date", () => {
    expect(logRideSchema.safeParse({ coasterId: "nemesis", riddenOn: "13/06/2026" }).success).toBe(
      false,
    );
    expect(logRideSchema.safeParse({ coasterId: "nemesis", riddenOn: "" }).success).toBe(false);
  });

  it("rejects a missing coaster", () => {
    expect(logRideSchema.safeParse({ coasterId: "", riddenOn: "2026-06-13" }).success).toBe(false);
  });

  it("carries no user id — who is acting comes from the session", () => {
    const result = logRideSchema.safeParse({
      coasterId: "nemesis",
      riddenOn: "2026-06-13",
      user_id: "someone-else",
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("user_id");
  });
});

describe("coasterSchema", () => {
  it("accepts a complete coaster", () => {
    const result = coasterSchema.safeParse({
      name: "Nemesis",
      park: "Alton Towers",
      country: "United Kingdom",
      manufacturer: "Bolliger & Mabillard",
      type: "Steel",
    });
    expect(result.success).toBe(true);
  });

  it("requires name, park, country and manufacturer", () => {
    const result = coasterSchema.safeParse({
      name: " ",
      park: "",
      country: "",
      manufacturer: "",
      type: "Steel",
    });
    expect(result.success).toBe(false);
    expect(Object.keys(fieldErrors(result.error!)).sort()).toEqual([
      "country",
      "manufacturer",
      "name",
      "park",
    ]);
  });

  it("rejects a type outside the three the catalogue allows", () => {
    const base = {
      name: "Nemesis",
      park: "Alton Towers",
      country: "United Kingdom",
      manufacturer: "B&M",
    };
    expect(coasterSchema.safeParse({ ...base, type: "Suspended" }).success).toBe(false);
    expect(coasterSchema.safeParse({ ...base, type: "Hybrid" }).success).toBe(true);
  });
});
