const GenericVarPrefix = "--";
const StylekitPrefix = "--sn-stylekit";
const StylekitPrefixToBurn = "--sn-";

export default class CSSParser {
  /*
    @param css: CSS file contents in string format
  */
  static cssToObject(css) {
    let object = {};
    let lines = css.split("\n");

    for(var line of lines) {
      line = line.trim();
      if(line.startsWith(GenericVarPrefix)) {
        // Remove initial "--"
        if(line.startsWith(StylekitPrefix)) {
          line = line.slice(StylekitPrefixToBurn.length, line.length);
        } else {
          // Not all vars start with --sn-stylekit. e.g --background-color
          line = line.slice(GenericVarPrefix.length, line.length);
        }
        let parts = line.split(":");
        let key = parts[0].trim();
        let value = parts[1].trim();;

        key = this.hyphenatedStringToCamelCase(key);
        value = value.replace(";", "").trim();

        object[key] = value;
      }
    }

    this.resolveVariablesThatReferenceOtherVariables(object);

    return object;
  }

  static resolveVariablesThatReferenceOtherVariables(object) {
    for(const key of Object.keys(object)) {
      let value = object[key];
      let stripValue = "var(";
      if(value.startsWith(stripValue)) {
        let from = stripValue.length;
        let to = value.indexOf(")");
        let varName = value.slice(from, to);
        if(varName.startsWith(StylekitPrefix)) {
          varName = varName.slice(StylekitPrefixToBurn.length, varName.length);
        } else {
          // Not all vars start with --sn-stylekit. e.g --background-color
          varName = varName.slice(GenericVarPrefix.length, varName.length);
        }
        varName = this.hyphenatedStringToCamelCase(varName);
        object[key] = object[varName];
      }
    }
  }

  static hyphenatedStringToCamelCase(string) {
    let comps = string.split("-");
    let result = "";
    for(var i = 0; i < comps.length; i++) {
      let part = comps[i];
      if(i == 0) {
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
