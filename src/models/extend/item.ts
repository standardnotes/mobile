import moment from '@Lib/moment';

import { SFItem } from 'snjs';

// Override Item instance methods without overriding actual class, since we'd then need
// to override all individual classes, like Note and Tag.

const original_updateFromJSON = SFItem.prototype.updateFromJSON;
SFItem.prototype.updateFromJSON = function (json: unknown) {
  original_updateFromJSON.apply(this, [json]);

  if (this.created_at) {
    this.created_at = moment(this.created_at);
    this.updated_at = moment(this.updated_at);
  } else {
    this.created_at = moment(new Date());
    this.updated_at = moment(new Date());
  }
};

SFItem.prototype.dateToLocalizedString = function (date: string) {
  return moment(date).format('llll');
};

SFItem.prototype.updatedAtTimestamp = function () {
  // date is a moment date
  // in the base class we do date.getTime(), but that doesn't work with moment dates.
  return this.updated_at.valueOf();
};

// Define these getters
Object.defineProperty(SFItem.prototype, 'key', {
  get: function key() {
    return this.uuid;
  },
});
