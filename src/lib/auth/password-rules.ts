/**
 * Password rules, in a module with no server-only dependencies.
 *
 * The hashing itself lives in `password.ts`, which imports `server-only` and
 * pulls in a native Argon2 binding — neither of which can cross into the
 * browser. But the forms need to tell people how long a password has to be, so
 * the numbers live here where both sides can read them and there is exactly one
 * definition of the rule.
 *
 * Long enough to matter, short enough that Argon2 is never handed a megabyte of
 * input as a denial-of-service. The floor is deliberately a length rule and
 * nothing else: composition rules ("one capital, one symbol") push people
 * towards `Password1!` and are no longer recommended by anyone.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;
