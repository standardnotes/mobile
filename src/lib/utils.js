
/**
  This removes non-alphanumeric characters from the given string.
*/
export function stripNonAlphanumeric(str) {
  return str.replace(/\W/g, '');
}

export function isMatchCaseInsensitive(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}