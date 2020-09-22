import React from 'react';
import { Platform, StyleSheet, Text, TextStyle } from 'react-native';
import SNReactNative from 'standard-notes-rn';

// This fixes this bug: https://github.com/facebook/react-native/issues/15114
// As of 6/2/2020, this bug is marked as closed and Facebook has signalled that
// they are not interested in reopening it, even though it is clearly a real bug
// affecting many users. One phone you can reproduce it on is a OnePlus 7 Pro.

// The root of the problem is something like, OnePlus and Oppo phones use a special
// font that those companies developed (Slate and OPPO Sans, respectively), but
// React Native for Android doesn't know that or recognize that and does measurements
// for layout using Roboto, which is a slightly different size.

// There are a couple of different ways we can fix this.
// One is that we can make affected Android devices always use Roboto as the default
// fontFamily. The downside of this is that users accustomed to Slate or OPPO Sans as
// their system font will see Roboto here instead.
//
// It's conceivable that some affected devices may not have the Roboto font
// installed (though it seems unlikely). We could include Roboto with this app and use
// it, but things like fontWeight and fontStyle will be affected when using a
// non-system font, and it also is probably unnecessary bloat for the app.
//
// We could also fix this by using Slate on OnePlus phones, OPPO Sans on Oppo phones,
// etc. One downside with this is that users of OnePlus phoens can choose to make
// Roboto their system default font! And there's no obvious way to detect that
// (though maybe it is possible). On Oppo phones, it seems like users have a few
// different choices for the system default font, so it's unlikely to be easy
// to correctly match that.
//
// What we choose to do is assume that users will choose the default system default
// font for their phones, and then try to use that when we can, using Slate on OnePlus,
// and falling back to Roboto for LG phones or Oppo phones.
//

export function enableAndroidFontFix() {
  // Bail if this isn't an Android device
  if (Platform.OS !== 'android') {
    return;
  }

  let manufacturer = SNReactNative.MANUFACTURER;

  // We don't want to do this for every device, even every Android device, since
  // wrapping the Text element will create some overhead for each one that's rendered
  // on the screen, and we don't want to have that performance penalty if we don't
  // need to

  let styles;

  switch (manufacturer) {
    case 'OnePlus':
      styles = StyleSheet.create({
        androidFontFixFontFamily: {
          fontFamily: 'Slate',
          // fontFamily: 'Roboto',
        },
      });
      break;

    case 'Oppo':
      styles = StyleSheet.create({
        androidFontFixFontFamily: {
          // fontFamily: 'Oppo Sans', // not sure of the name of the font
          fontFamily: 'Roboto',
        },
      });
      break;

    case 'LG': // https://github.com/facebook/react-native/issues/15114#issuecomment-366066157
      styles = StyleSheet.create({
        androidFontFixFontFamily: {
          // We don't know the default fontFamily for the LG platform
          fontFamily: 'Roboto',
        },
      });
      break;

    default:
      return;
  }

  let __render = Text.render;
  Text.render = function (...args) {
    let origin = __render.call(this, ...args);
    return React.cloneElement(origin, {
      style: [styles.androidFontFixFontFamily, origin.props.style],
    });
  };
}
