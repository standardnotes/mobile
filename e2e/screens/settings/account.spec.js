const helpers = require('./../../helpers');
const faker = require('faker');

const randomCredentials = {
  email: faker.internet.exampleEmail(),
  password: faker.internet.password(),
  syncServerUrl: 'http://syncing-server.dev:3000'
};

describe('Account section', () => {
  describe('Form', () => {
    before(async () => {
      await helpers.openSettingsScreen();
    });

    it('should have the "Email" and "Password" fields visible', async () => {
      await expect(element(by.id('emailField'))).toBeVisible();
      await expect(element(by.id('passwordField'))).toBeVisible();
    });

    it('should have the "Sign In" button visible', async () => {
      await expect(element(by.id('signInButton'))).toBeVisible();
    });

    it('should have the "Register" button visible', async () => {
      await expect(element(by.id('registerButton'))).toBeVisible();
    });

    it('should have the "Other Options" button visible', async () => {
      await expect(element(by.id('otherOptionsButton'))).toBeVisible();
    });

    it('should have the "Sync Server" field visible when "Other Options" button is pressed', async () => {
      await element(by.id('otherOptionsButton')).tap();
      await expect(element(by.id('syncServerField'))).toBeVisible();
    });
  });

  describe('Register', () => {
    before(async () => {
      await helpers.openSettingsScreen();
    });

    it('should work when valid data is provided', async () => {
      await element(by.id('emailField')).typeText(randomCredentials.email);
      await element(by.id('passwordField')).typeText(randomCredentials.password);
      await element(by.id('otherOptionsButton')).tap();
      await element(by.id('syncServerField')).clearText();
      await element(by.id('syncServerField')).typeText(randomCredentials.syncServerUrl);
      await element(by.id('registerButton')).tap();

      // A confirmation screen is shown after we click the register button...
      await expect(element(by.id('passwordConfirmationField'))).toBeVisible();
      await expect(element(by.id('registerConfirmButton'))).toBeVisible();

      // Password confirmation is required...
      await element(by.id('passwordConfirmationField')).typeText(randomCredentials.password);
      await element(by.id('registerConfirmButton')).tap();
    });

    after(async () => {
      await helpers.openSettingsScreen();

      // Account is created and we now proceed to sign out...
      await expect(element(by.id('signOutButton'))).toBeVisible();
      await element(by.id('signOutButton')).tap();

      // Confirmation button in the dialog...
      await expect(element(by.text('SIGN OUT'))).toBeVisible();
      await element(by.text('SIGN OUT')).tap();
    });
  });

  describe('Sign In', () => {
    before(async () => {
      await helpers.openSettingsScreen();
    });

    it('should work when valid data is provided', async () => {
      await element(by.id('emailField')).typeText(randomCredentials.email);
      await element(by.id('passwordField')).typeText(randomCredentials.password);
      await element(by.id('otherOptionsButton')).tap();
      await element(by.id('syncServerField')).clearText();
      await element(by.id('syncServerField')).typeText(randomCredentials.syncServerUrl);
      await element(by.id('signInButton')).tap();
    });
  });
});
