const PREFIX_GENERIC = '--';
const PREFIX_STANDARD_NOTES = '--sn-stylekit';
const PREFIX_STANDARD_NOTES_BURN = '--sn-';

export default class CSSParser {
  /**
   * @param css: CSS file contents in string format
   */
  static cssToObject(css) {
    const object = {};
    const lines = css.split('\n');

    for (let line of lines) {
      line = line.trim();
      if (line.startsWith(PREFIX_GENERIC)) {
        // Remove initial '--'
        if (line.startsWith(PREFIX_STANDARD_NOTES)) {
          line = line.slice(PREFIX_STANDARD_NOTES_BURN.length, line.length);
        } else {
          // Not all vars start with --sn-stylekit. e.g --background-color
          line = line.slice(PREFIX_GENERIC.length, line.length);
        }
        const parts = line.split(':');
        let key = parts[0].trim();
        let value = parts[1].trim();

        key = this.hyphenatedStringToCamelCase(key);
        value = value.replace(';', '').trim();

        object[key] = value;
      }
    }

    this.resolveVariablesThatReferenceOtherVariables(object);

    return object;
  }

  static resolveVariablesThatReferenceOtherVariables(object, round = 0) {
    for (const key of Object.keys(object)) {
      const value = object[key];
      const stripValue = 'var(';
      if (typeof value === 'string' && value.startsWith(stripValue)) {
        const from = stripValue.length;
        const to = value.indexOf(')');
        let varName = value.slice(from, to);
        if (varName.startsWith(PREFIX_STANDARD_NOTES)) {
          varName = varName.slice(
            PREFIX_STANDARD_NOTES_BURN.length,
            varName.length
          );
        } else {
          // Not all vars start with --sn-stylekit. e.g --background-color
          varName = varName.slice(PREFIX_GENERIC.length, varName.length);
        }
        varName = this.hyphenatedStringToCamelCase(varName);
        object[key] = object[varName];
      }
    }

    // Two rounds are required. The first will replace all right hand side variables with
    // the left hand counterparts. In the first round, variables on rhs mentioned before
    // its value has been gotten to in the loop will be missed. The second round takes care of this
    // and makes sure that all values will resolve.
    if (round === 0) {
      this.resolveVariablesThatReferenceOtherVariables(object, ++round);
    }
  }

  static hyphenatedStringToCamelCase(string) {
    const comps = string.split('-');
    let result = '';
    for (let i = 0; i < comps.length; i++) {
      let part = comps[i];
      if (i === 0) {
        result += part;
      } else {
        result += this.capitalizeFirstLetter(part);
      }
    }

    return result;
  }

  static capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
