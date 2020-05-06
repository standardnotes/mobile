const faker = require('faker');
import { device, waitFor, element, by } from 'detox';

export const openSettingsScreen = async () => {
  await device.reloadReactNative();

  // Opens the settings screen
  await waitFor(element(by.id('rootView')))
    .toBeVisible()
    .withTimeout(2000);
  await element(by.id('headerButton')).tap();
  await element(by.id('settingsButton')).tap();
};

export const openComposeNewNoteScreen = async () => {
  await device.reloadReactNative();

  // Opens the screen to compose a new note
  await waitFor(element(by.id('rootView')))
    .toBeVisible()
    .withTimeout(2000);
  await waitFor(element(by.id('newNoteButton')))
    .toBeVisible()
    .withTimeout(2000);
  console.log(element(by.id('newNoteButton')));
  await element(by.id('newNoteButton')).tap();
};

export const randomCredentials = {
  email: faker.internet.exampleEmail(),
  password: faker.internet.password(),
  syncServerUrl: 'http://127.0.0.1:3000/',
};
