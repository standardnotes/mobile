const moment = require('moment');

describe('Export Data', () => {
  beforeEach(async () => {
    await device.reloadReactNative();

    // Opens the settings screen
    await waitFor(element(by.id('rootView'))).toBeVisible().withTimeout(2000);
    await element(by.id('noteListHeader')).swipe('right', 'fast');
  });

  it('should have the "Export Data" option visible', async () => {
    await expect(element(by.id('exportData'))).toBeVisible();
    await expect(element(by.id('exportData-title'))).toHaveText('Export Data');
  });

  it('should restore to "Export Data" if dialog is dismissed', async () => {
    await expect(element(by.id('exportData-option-decrypted'))).toBeVisible();
    await element(by.id('exportData-option-decrypted')).tap();
    await device.pressBack();
    await expect(element(by.id('exportData-title'))).toHaveText('Export Data');
  });

  it('should export decrypted notes', async () => {
    await expect(element(by.id('exportData-option-decrypted'))).toBeVisible();
    await element(by.id('exportData-option-decrypted')).tap();
    await element(by.text('SAVE TO DISK')).tap();

    const lastExportDate = new Date();

    await element(by.text('DONE')).tap();
    await expect(element(by.id('exportData-title'))).toHaveText('Export Data');

    const formattedDate = moment(lastExportDate).format('lll');
    const lastExportString = `Last exported on ${formattedDate}`;

    await expect(element(by.id('lastExportDate-text'))).toHaveText(lastExportString);
  });
});
