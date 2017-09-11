import Item from "../api/item"
var _ = require('lodash')

export default class Theme extends Item {

  constructor(json_obj) {
    super(json_obj);
  }

  mapContentToLocalProperties(contentObject) {
    super.mapContentToLocalProperties(contentObject)
    this.url = contentObject.url;
    this.name = contentObject.name;
    this.mobileRules = contentObject.mobileRules;
  }

  structureParams() {
    var params = {
      url: this.url,
      name: this.name,
      mobileRules: this.mobileRules
    };

    _.merge(params, super.structureParams());
    return params;
  }

  toJSON() {
    return {uuid: this.uuid}
  }

  get content_type() {
    return "SN|Theme";
  }
}
