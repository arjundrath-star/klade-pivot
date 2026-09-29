declare const reduced: unique symbol;

/**
 * An exact fraction in lowest terms with a positive denominator. Only `rational` and `tryRational`
 * build one, so a stored `{ num, den }` must pass through them before it is compared.
 */
export type Rational = { readonly num: number; readonly den: number; readonly [reduced]: true };

function gcd(a: number, b: number): number {
  let x = a < 0 ? -a : a;
  let y = b < 0 ? -b : b;
  while (y !== 0) [x, y] = [y, x % y];
  return x;
}

/** A reduced rational, or null unless both parts are safe integers and `den` is nonzero. */
export function tryRational(num: number, den = 1): Rational | null {
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || den === 0) return null;
  const sign = den < 0 ? -1 : 1;
  const divisor = gcd(num, den);
  // `+ 0` folds -0 into 0 so equal values compare equal.
  return { num: (sign * num) / divisor + 0, den: (sign * den) / divisor } as Rational;
}

/** A reduced rational from parts known to be valid; throws otherwise. */
export function rational(num: number, den = 1): Rational {
  const value = tryRational(num, den);
  if (!value) throw new RangeError(`Invalid rational ${num}/${den}`);
  return value;
}

/** Exact equality: reduced forms are unique, so no cross-multiplication is needed. */
export function equals(x: Rational, y: Rational): boolean {
  return x.num === y.num && x.den === y.den;
}

export function formatRational({ num, den }: Rational): string {
  return den === 1 ? String(num) : `${num}/${den}`;
}
