const faker = require('faker');
import { device, waitFor, element, by, expect } from 'detox';

export const expectToBeVisible = async (testedElement: Detox.DetoxAny) => {
  try {
    await expect(testedElement).toBeVisible();
    return true;
  } catch (e) {
    return false;
  }
};

const checkAfterReinstall = async () => {
  if (device.getPlatform() === 'ios') {
    let alertVisible = await expectToBeVisible(
      element(
        by
          .label('Delete Local Data')
          .and(by.type('_UIAlertControllerActionView'))
      )
    );
    if (alertVisible) {
      await element(
        by
          .label('Delete Local Data')
          .and(by.type('_UIAlertControllerActionView'))
      ).tap();
    }
  }
};

export const openSettingsScreen = async () => {
  await checkAfterReinstall();
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
  syncServerUrl: 'https://testapi.standardnotes.org/',
};
