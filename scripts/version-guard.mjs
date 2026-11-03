/**
 * Immutability guard for versioned manual keys.
 *
 * `manual/bitty-manual/v<version>/...` is advertised as immutable and served
 * with a one-year cache, so republishing a different payload under an existing
 * version leaves CDN edges disagreeing with each other and with every lock file
 * that pinned the version. The uploader therefore refuses to replace an
 * existing versioned object whose bytes differ from the local artifact; the
 * fix is always to bump `manifest.version`.
 *
 * Kept as plain functions so the decision table is testable without wrangler.
 */

/** A key is versioned when it carries the current version in a version slot. */
export function isVersionedKey(r2Key, version) {
  if (
    typeof r2Key !== "string" ||
    typeof version !== "string" ||
    version === ""
  ) {
    return false;
  }
  return (
    r2Key.includes(`/v${version}/`) ||
    r2Key.includes(`-${version}.`) ||
    r2Key.includes(`-${version}-`)
  );
}

/**
 * Decision for one versioned key.
 *
 * - `remoteSha === null` means the object does not exist yet.
 * - `remoteSha === localSha` means the publish is idempotent (re-running CD on
 *   the same commit) and may proceed.
 * - anything else is a content change under a frozen version and must abort.
 */
export function decideVersionedWrite({ remoteSha, localSha }) {
  if (typeof localSha !== "string" || localSha === "") {
    throw new Error("localSha is required");
  }
  if (remoteSha === null || remoteSha === undefined) {
    return "write";
  }
  if (remoteSha === localSha) {
    return "idempotent";
  }
  return "reject";
}

/**
 * Wrangler reports a missing key as a CLI error; only that class is treated as
 * "absent". Any other failure (auth, network, bucket) must abort instead of
 * silently overwriting a frozen object.
 */
export function isMissingKeyError(message) {
  if (typeof message !== "string" || message === "") {
    return false;
  }
  return /not\s*found|404|does not exist|specified key/i.test(message);
}
