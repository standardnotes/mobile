module.exports.openSettingsScreen = async () => {
  await device.reloadReactNative();

  // Opens the settings screen
  await waitFor(element(by.id('rootView'))).toBeVisible().withTimeout(2000);
  await element(by.id('headerButton')).tap();
  await element(by.id('settingsButton')).tap();
};
