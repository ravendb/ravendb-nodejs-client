/**
 * Controls the patch command format used by the session patch methods
 * (session.advanced.patch(), patchArray(), patchObject()).
 *
 * - "JsonPatch": generate RFC 6902 JsonPatch commands where possible (default). Operations without a
 *   JsonPatch equivalent (object / Date values, increment(), unparsable paths) still fall back to
 *   JavaScript-based patch commands.
 * - "JavaScript": always generate JavaScript-based patch commands (the behavior prior to JsonPatch support).
 *   Use this to opt out of the JsonPatch code path entirely.
 */
export type SessionPatchBehavior = "JsonPatch" | "JavaScript";
