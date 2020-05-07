import { Platform, ViewStyle } from 'react-native';

export default class PlatformStyles {
  styles: ViewStyle | any;
  constructor(styles: ViewStyle | any) {
    this.styles = styles;
  }

  get(key: any) {
    const rules = this.styles;
    const styles = [rules[key]];
    const platform = Platform.OS === 'android' ? 'Android' : 'IOS';

    // TODO: should be removed
    // @ts-ignore
    const platformRules = rules[key + platform];
    if (platformRules) {
      styles.push(platformRules);
    }
    return styles;
  }
}
