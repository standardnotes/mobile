import { AsyncStorage } from 'react-native'
import Storage from './storage'

export default class Server {

  static instance = null;

  static getInstance() {
    if (this.instance == null) {
      this.instance = new Server();
    }

    return this.instance;
  }

  postAbsolute(url, params, onsuccess, onerror) {
    this.httpRequest("post", url, params, onsuccess, onerror);
  }

  patchAbsolute(url, params, onsuccess, onerror) {
    this.httpRequest("patch", url, params, onsuccess, onerror);
  }

  getAbsolute(url, params, onsuccess, onerror) {
    this.httpRequest("get", url, params, onsuccess, onerror);
  }

  async httpRequest(verb, url, params, onsuccess, onerror) {

    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function() {
      if (xmlhttp.readyState == 4) {
        var response = xmlhttp.responseText;
        if(response) {
          try {
            response = JSON.parse(response);
          } catch(e) {}
        }

       if(xmlhttp.status >= 200 && xmlhttp.status <= 299){
          onsuccess(response);
       } else {
          console.log("Request error");
          onerror(response)
       }
     }
   }.bind(this)

    if(verb == "get" && Object.keys(params).length > 0) {
      url = url + this.formatParams(params);
    }

    xmlhttp.open(verb, url, true);

    var token = await Storage.getItem("jwt");
    xmlhttp.setRequestHeader('Authorization', 'Bearer ' + token);
    xmlhttp.setRequestHeader('Content-type', 'application/json');

    if(verb == "post" || verb == "patch") {
      xmlhttp.send(JSON.stringify(params));
    } else {
      xmlhttp.send();
    }
  }

  formatParams(params) {
    return "?" + Object.keys(params).map(function(key){
      return key + "=" + encodeURIComponent(params[key])
    }).join("&")
  }

}
