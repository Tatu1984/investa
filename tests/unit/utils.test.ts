import { describe, it, expect } from "vitest";
import { parseDurationToSeconds } from "../../src/backend/utils/cookies.util";
import { sha256Hex, randomToken } from "../../src/backend/utils/hash.util";
import { check, RULES } from "../../src/backend/utils/rate-limit.util";

describe("cookies.parseDurationToSeconds", () => {
  it("seconds", () => expect(parseDurationToSeconds("30s")).toBe(30));
  it("minutes", () => expect(parseDurationToSeconds("15m")).toBe(900));
  it("hours", () => expect(parseDurationToSeconds("2h")).toBe(7200));
  it("days", () => expect(parseDurationToSeconds("3d")).toBe(259_200));
  it("falls back to 900 on garbage", () => expect(parseDurationToSeconds("?")).toBe(900));
});

describe("hash.sha256Hex", () => {
  it("matches a known vector", () => {
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("is deterministic", () => {
    expect(sha256Hex("hello")).toBe(sha256Hex("hello"));
  });
});

describe("hash.randomToken", () => {
  it("is base64url and high-entropy", () => {
    const a = randomToken(32);
    const b = randomToken(32);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThan(30);
  });
});

describe("rate-limit (in-memory)", () => {
  it("allows up to limit and blocks after", () => {
    const rule = { name: `t-${Math.random()}`, limit: 3, windowSec: 60 };
    const key = "ip-1";
    expect(check(key, rule).allowed).toBe(true);
    expect(check(key, rule).allowed).toBe(true);
    expect(check(key, rule).allowed).toBe(true);
    const fourth = check(key, rule);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.resetAfterSec).toBeGreaterThan(0);
  });

  it("isolates buckets by key", () => {
    const rule = { name: `t2-${Math.random()}`, limit: 1, windowSec: 60 };
    expect(check("alice", rule).allowed).toBe(true);
    expect(check("bob", rule).allowed).toBe(true);
    expect(check("alice", rule).allowed).toBe(false);
  });

  it("RULES are reasonable", () => {
    expect(RULES.LOGIN.limit).toBeGreaterThan(0);
    expect(RULES.SIGNUP.windowSec).toBeGreaterThan(60);
  });
});
