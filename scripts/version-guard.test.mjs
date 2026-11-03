import { describe, expect, test } from "bun:test";

import {
  decideVersionedWrite,
  isMissingKeyError,
  isVersionedKey,
} from "./version-guard.mjs";

const LOCAL = "a".repeat(64);
const REMOTE = "b".repeat(64);

describe("isVersionedKey", () => {
  test("matches the canonical versioned bundle path", () => {
    expect(
      isVersionedKey("manual/bitty-manual/v0.1.1/en.tar.gz", "0.1.1"),
    ).toBe(true);
  });

  test("matches the legacy versioned bundle name", () => {
    expect(isVersionedKey("manual/bitty-manual-0.1.1-en.tar.gz", "0.1.1")).toBe(
      true,
    );
  });

  test("ignores the mutable latest pointers", () => {
    expect(isVersionedKey("manual/bitty-manual/en.tar.gz", "0.1.1")).toBe(
      false,
    );
    expect(
      isVersionedKey("manual/bitty-manual/latest/en.tar.gz", "0.1.1"),
    ).toBe(false);
  });

  test("does not match a different version", () => {
    expect(
      isVersionedKey("manual/bitty-manual/v0.1.0/en.tar.gz", "0.1.1"),
    ).toBe(false);
  });

  test("rejects malformed input", () => {
    expect(isVersionedKey(undefined, "0.1.1")).toBe(false);
    expect(isVersionedKey("manual/bitty-manual/v0.1.1/en.tar.gz", "")).toBe(
      false,
    );
  });
});

describe("decideVersionedWrite", () => {
  test("writes when the object is absent", () => {
    expect(decideVersionedWrite({ remoteSha: null, localSha: LOCAL })).toBe(
      "write",
    );
  });

  test("allows an idempotent republish of identical bytes", () => {
    expect(decideVersionedWrite({ remoteSha: LOCAL, localSha: LOCAL })).toBe(
      "idempotent",
    );
  });

  test("rejects a content change under a frozen version", () => {
    expect(decideVersionedWrite({ remoteSha: REMOTE, localSha: LOCAL })).toBe(
      "reject",
    );
  });

  test("requires the local digest", () => {
    expect(() => decideVersionedWrite({ remoteSha: null })).toThrow();
  });
});

describe("isMissingKeyError", () => {
  test("recognises the wrangler not-found shapes", () => {
    expect(isMissingKeyError("The specified key does not exist.")).toBe(true);
    expect(isMissingKeyError("✘ [ERROR] 404 Not Found")).toBe(true);
  });

  test("does not swallow other failures", () => {
    expect(isMissingKeyError("Authentication error [code: 10000]")).toBe(false);
    expect(isMissingKeyError("socket hang up")).toBe(false);
    expect(isMissingKeyError("")).toBe(false);
  });
});
