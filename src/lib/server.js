import { AsyncStorage } from 'react-native'
import Storage from './storage'
import KeysManager from './keysManager'

export default class Server {

  static instance = null;

  static getInstance() {
    if (this.instance == null) {
      this.instance = new Server();
    }

    return this.instance;
  }

  async postAbsolute(url, params, onsuccess, onerror) {
    return this.httpRequest("post", url, params, onsuccess, onerror);
  }

  async patchAbsolute(url, params, onsuccess, onerror) {
    return this.httpRequest("patch", url, params, onsuccess, onerror);
  }

  async getAbsolute(url, params, onsuccess, onerror) {
    return this.httpRequest("get", url, params, onsuccess, onerror);
  }

  async httpRequest(verb, url, params, onsuccess, onerror) {

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == 4) {
        var response = xmlhttp.responseText;
        if(response) {
          try {
            response = JSON.parse(response);
          } catch(e) {
            console.log("Error parsing JSON");
            onerror(response);
            return;
          }
        }

       if(xmlhttp.status >= 200 && xmlhttp.status <= 299){
          onsuccess(response);
       } else {
          console.log("Request error");
          onerror(response, xmlhttp.status)
       }
     }
   }.bind(this)

    if(verb == "get" && Object.keys(params).length > 0) {
      url = url + this.formatParams(params);
    }

    xmlhttp.open(verb, url, true);

    var token = KeysManager.get().jwt();
    if(token) {
      xmlhttp.setRequestHeader('Authorization', 'Bearer ' + token);
    }
    xmlhttp.setRequestHeader('Content-type', 'application/json');

    if(verb == "post" || verb == "patch") {
      xmlhttp.send(JSON.stringify(params));
    } else {
      xmlhttp.send();
    }

    return xmlhttp;
  }

  formatParams(params) {
    return "?" + Object.keys(params).map(function(key){
      return key + "=" + encodeURIComponent(params[key])
    }).join("&")
  }

}
