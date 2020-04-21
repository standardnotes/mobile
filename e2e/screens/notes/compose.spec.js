/* eslint-disable no-undef */
const helpers = require('../../helpers');
const faker = require('faker');

describe('Compose', () => {
  describe('Form', () => {
    before(async () => {
      await helpers.openComposeNewNoteScreen();
    });

    it('should have the "Title" and "Content" fields visible', async () => {
      await expect(element(by.id('noteTitleField'))).toBeVisible();
      await expect(element(by.id('noteContentField'))).toBeVisible();
    });

    it('should have the back button visible', async () => {
      await expect(element(by.id('headerButton'))).toBeVisible();
    });
  });

  describe('New note', () => {
    it('should be created with only the "Title"', async () => {
      const noteTitle = faker.random.word();
      await element(by.id('noteTitleField')).typeText(noteTitle);
      await waitFor(element(by.id('noteTitleField')))
        .toHaveText(noteTitle)
        .withTimeout(2000);
    });

    afterEach(async () => {
      await element(by.id('headerButton')).tap();
    });
  });
});
