import Item from "../api/item"
var _ = require('lodash')

export default class Theme extends Item {

  constructor(json_obj) {
    super(json_obj);
  }

  mapContentToLocalProperties(contentObject) {
    super.mapContentToLocalProperties(contentObject)
    this.url = contentObject.url;
    this.hosted_url = contentObject.hosted_url;
    this.name = contentObject.name;
    this.mobileRules = contentObject.mobileRules;
    this.notAvailableOnMobile = contentObject.notAvailableOnMobile;
  }

  structureParams() {
    var params = {
      url: this.url,
      name: this.name,
      hosted_url: this.hosted_url,
      mobileRules: this.mobileRules,
      notAvailableOnMobile: this.notAvailableOnMobile
    };

    _.merge(params, super.structureParams());
    return params;
  }

  get content_type() {
    return "SN|Theme";
  }

  get displayName() {
    return "Theme";
  }
}
