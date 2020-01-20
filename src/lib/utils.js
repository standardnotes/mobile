export function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

/**
 * Returns a string with non-alphanumeric characters stripped out
 */
export function stripNonAlphanumeric(str) {
  return str.replace(/\W/g, '');
}

export function isMatchCaseInsensitive(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Returns a Date object from a JSON stringifed date
 */
export function dateFromJsonString(str) {
  if(str) {
    return new Date(JSON.parse(str));
  }

  return str;
}