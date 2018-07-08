import {moment} from "../../app"

// Override Item instance methods without overriding actual class, since we'd then need
// to override all individual classes, like Note and Tag.

const original_updateFromJSON = SFItem.prototype.updateFromJSON;
SFItem.prototype.updateFromJSON = function(json) {
  original_updateFromJSON.apply(this, [json]);

  if(this.created_at) {
    this.created_at = moment(this.created_at);
    this.updated_at = moment(this.updated_at);
  } else {
    this.created_at = moment(new Date());
    this.updated_at = moment(new Date());
  }
}

const original_dateToLocalizedString = SFItem.prototype.dateToLocalizedString;
SFItem.prototype.dateToLocalizedString = function(date) {
  return moment(date).format('llll');
}

// Define these new methods

SFItem.prototype.initUUID = async function(date) {
  if(!this.uuid) {
    return SFJS.crypto.generateUUID().then((uuid) => {
      this.uuid = uuid;
    })
  }
}

SFItem.prototype.initUUID = async function(date) {
  if(!this.uuid) {
    return SFJS.crypto.generateUUID().then((uuid) => {
      this.uuid = uuid;
    })
  }
}

// Define these getters

Object.defineProperty(SFItem.prototype, "key", {
    get: function key() {
        return this.uuid;
    }
});
