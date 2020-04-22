/*
  There's an issue with OnePlus devices cutting off Text due to font configuration.
  The fix seems to be to set Roboto explicitely as the font.
  To use this fix, just import this file.
  https://github.com/facebook/react-native/issues/15114
*/

const React = require('react');
const { Platform, Text } = require('react-native');

const defaultFontFamily = {
  ...Platform.select({
    android: { fontFamily: 'Roboto' },
  }),
};

const oldRender = Text.render;
Text.render = function (...args) {
  const origin = oldRender.call(this, ...args);
  return React.cloneElement(origin, {
    style: [defaultFontFamily, origin.props.style],
  });
};
