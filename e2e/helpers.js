/* eslint-disable no-undef */
const faker = require('faker');

module.exports.openSettingsScreen = async () => {
  await device.reloadReactNative();

  // Opens the settings screen
  await waitFor(element(by.id('rootView')))
    .toBeVisible()
    .withTimeout(2000);
  await element(by.id('headerButton')).tap();
  await element(by.id('settingsButton')).tap();
};

module.exports.openComposeNewNoteScreen = async () => {
  await device.reloadReactNative();

  // Opens the screen to compose a new note
  await waitFor(element(by.id('rootView')))
    .toBeVisible()
    .withTimeout(2000);
  await element(by.id('newNoteButton')).tap();
};

module.exports.randomCredentials = {
  email: faker.internet.exampleEmail(),
  password: faker.internet.password(),
  syncServerUrl: 'http://syncing-server.dev:3000',
};
