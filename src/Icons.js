const Ionicons = require('react-native-vector-icons/Ionicons');

const icons = {
  "ios-menu-outline": [Ionicons, 25, '#FFFFFF'],
  "ios-contact-outline": [Ionicons, 25, '#FFFFFF'],
  "md-add" : [Ionicons, 25, '#FFFFFF']
};

let iconsMap = {};
let iconsLoaded = new Promise((resolve, reject) => {
  new Promise.all(
    Object.keys(icons).map(iconName =>
      icons[iconName][0].getImageSource(
        iconName,
        icons[iconName][1],
        icons[iconName][2]
      ))
  ).then(sources => {
    Object.keys(icons)
      .forEach((iconName, idx) => iconsMap[iconName] = sources[idx]);
    resolve(true);
  })
});

export {
  iconsMap,
  iconsLoaded
};
