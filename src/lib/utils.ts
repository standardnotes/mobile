import { SNNote, SNTag } from 'snjs';

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

export function notePassesFilter(
  note: SNNote,
  selectedTag: SNTag,
  showArchived: boolean,
  hidePinned: boolean,
  filterText: string
) {
  let canShowArchived = showArchived;
  const canShowPinned = !hidePinned;
  if (!selectedTag.isTrashTag && note.trashed) {
    return false;
  }
  const isSmartTag = selectedTag.isSmartTag();
  if (isSmartTag) {
    canShowArchived =
      canShowArchived || selectedTag.isArchiveTag || selectedTag.isTrashTag;
  }
  if ((note.archived && !canShowArchived) || (note.pinned && !canShowPinned)) {
    return false;
  }
  return noteMatchesQuery(note, filterText);
}

function noteMatchesQuery(note: SNNote, query: string) {
  if (query.length === 0) {
    return true;
  }
  const title = note.safeTitle().toLowerCase();
  const text = note.safeText().toLowerCase();
  const lowercaseText = query.toLowerCase();
  const quotedText = stringBetweenQuotes(lowercaseText);
  if (quotedText) {
    return title.includes(quotedText) || text.includes(quotedText);
  }
  if (stringIsUuid(lowercaseText)) {
    return note.uuid === lowercaseText;
  }
  const words = lowercaseText.split(' ');
  const matchesTitle = words.every(word => {
    return title.indexOf(word) >= 0;
  });
  const matchesBody = words.every(word => {
    return text.indexOf(word) >= 0;
  });
  return matchesTitle || matchesBody;
}

function stringBetweenQuotes(text: string) {
  const matches = text.match(/"(.*?)"/);
  return matches ? matches[1] : null;
}

function stringIsUuid(text: string) {
  const matches = text.match(
    /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/
  );
  return matches ? true : false;
}
