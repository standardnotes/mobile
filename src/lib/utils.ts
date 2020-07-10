export function isNullOrUndefined(value: unknown) {
  return value === null || value === undefined;
}

/**
 * Returns a string with non-alphanumeric characters stripped out
 */
export function stripNonAlphanumeric(str: string) {
  return str.replace(/\W/g, '');
}

export function isMatchCaseInsensitive(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Returns a Date object from a JSON stringifed date
 */
export function dateFromJsonString(str: string) {
  if (str) {
    return new Date(JSON.parse(str));
  }

  return str;
}
