import {Platform} from 'react-native';

export default class PlatformStyles  {

  constructor(styles) {
    this.styles = styles;
  }

  get(key) {
    var rules = this.styles;
    var styles = [rules[key]];
    var platform = Platform.OS == "android" ? "Android" : "IOS";
    var platformRules = rules[key+platform];
    if(platformRules) {
      styles.push(platformRules);
    }
    return styles;
  }
}
