import { Platform } from 'react-native';

export default class PlatformStyles {
  constructor(styles) {
    this.styles = styles;
  }

  get(key) {
    const rules = this.styles;
    const styles = [rules[key]];
    const platform = Platform.OS === 'android' ? 'Android' : 'IOS';
    const platformRules = rules[key + platform];
    if (platformRules) {
      styles.push(platformRules);
    }
    return styles;
  }
}
