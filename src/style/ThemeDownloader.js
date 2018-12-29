import { StyleSheet, StatusBar, Alert, Platform, Dimensions } from 'react-native';

import Server from "../lib/sfjs/httpManager"
import ApplicationState from '../ApplicationState'
import CSSParser from "./CSSParser";

export default class ThemeDownloader {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ThemeDownloader();
    }

    return this.instance;
  }

  async downloadTheme(theme) {
    let errorBlock = (error) => {
      if(!theme.getNotAvailOnMobile()) {
        theme.setNotAvailOnMobile(true);
        theme.setDirty(true);
      }

      console.error("Theme download error", error);
    }

    var url = theme.hosted_url || theme.url;

    if(!url) {
      errorBlock(null);
      return;
    }

    if(url.includes("?")) {
      url = url.replace("?", ".json?");
    } else if(url.includes(".css?")) {
      url = url.replace(".css?", ".json?");
    } else {
      url = url + ".json";
    }

    if(ApplicationState.isAndroid && url.includes("localhost")) {
      url = url.replace("localhost", "10.0.2.2");
    }

    return Server.get().getAbsolute(url, {}, function(response){
      // success
      if(response !== theme.getMobileRules()) {
        theme.setMobileRules(response);
        theme.setDirty(true);
      }

      if(theme.getNotAvailOnMobile()) {
        theme.setNotAvailOnMobile(false);
        theme.setDirty(true);
      }
    }, function(response) {
      errorBlock(response);
    })
  }
}
