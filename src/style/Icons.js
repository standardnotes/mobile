const Ionicons = require('react-native-vector-icons/Ionicons');
import { Platform } from 'react-native';
import StyleKit from "@Style/StyleKit"

let iconsMap = {};

export default class Icons {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new Icons();
    }

    return this.instance;
  }

  static getIcon(name) {
    return iconsMap[name];
  }

  constructor() {
    this.loadIcons();
  }

  static nameForIcon(iconName) {
    const iconPrefix = Platform.OS == "android" ? "md" : "ios";
    const suffix = Platform.OS == "android" ? "" : "-outline";
    return iconPrefix + "-" + iconName + suffix;
  }

  async loadIcons(callback) {
    var color = StyleKit.variable("stylekitBackgroundColor"); //#FFFFFF

    let icons = {
      "ios-menu-outline": [Ionicons, 25, color],
      "ios-contact-outline": [Ionicons, 25, color],
      "ios-flag": [Ionicons, 25, color],

      "md-add" : [Ionicons, 25, color],
      "md-bookmark" : [Ionicons, 25, color],
      "md-pricetag" : [Ionicons, 25, color],
      "md-menu" : [Ionicons, 25, color],
      "md-more" : [Ionicons, 25, color],
      "md-settings" : [Ionicons, 25, color],
      "md-information-circle" : [Ionicons, 25, color],
    };

    return new Promise((resolve, reject) => {
      new Promise.all(
        Object.keys(icons).map(iconName =>
          icons[iconName][0].getImageSource(
            iconName,
            icons[iconName][1],
            icons[iconName][2]
          ))
      ).then(sources => {
        Object.keys(icons).forEach((iconName, idx) => {
          iconsMap[iconName] = sources[idx]
        })
        resolve(true);
      })
    });
  }

}
