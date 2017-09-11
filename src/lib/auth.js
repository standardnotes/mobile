import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import DBManager from './dbManager'
import Sync from './sync'
import ModelManager from './modelManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
var _ = require('lodash')

export default class Auth {

  static instance = null;

  static getInstance() {
    if (this.instance == null) {
      this.instance = new Auth();
    }

    return this.instance;
  }

  static _defaultServer() {
    if(Platform.OS === "android") {
      return "http://10.0.2.2:3000/"
    } else {
      return "http://localhost:3000/"
    }
  }

  constructor() {
    this.loadUser();
    this.signoutObservers = [];
  }

  loadUser() {
    try {
      Storage.getItem("user").then(function(userData){
        if(userData) {
          this.user = JSON.parse(userData);
        }
      }.bind(this));
    } catch(e) {
      console.log("Error loading user:", e);
    }
  }

  addSignoutObserver(callback) {
    var observer = {key: new Date(), callback: callback};
    this.signoutObservers.push(observer);
    return observer;
  }

  removeSignoutObserver(observer) {
    _.pull(this.signoutObservers, observer);
  }

  async serverUrl() {
    if(this.server) {
      return this.server;
    }
    this.server = await Storage.getItem("server");
    if(!this.server) {
      this.server = Auth._defaultServer();
    }
    return this.server;
  }

  async urlForPath(path) {
    function joinPaths(parts){
       var separator = "/";
       var replace = new RegExp(separator+'{1,}', 'g');
       return parts.join(separator).replace(replace, separator);
    }

    var serverUrl = await this.serverUrl();
    return joinPaths([serverUrl, path]);
  }

  offline() {
    return !this.keys();
  }

  async savedAuthParams() {
    if(!this._authParams) {
      var result = await Storage.getItem("auth_params")
      this._authParams = JSON.parse(result);
    }
    return this._authParams;
  }

  async protocolVersion() {
    var authParams = await this.savedAuthParams();
    if(authParams && authParams.version) {
      return authParams.version;
    }

    var keys = this.keys();
    if(keys && keys.ak) {
      return "002";
    } else {
      return "001";
    }
  }

  async loadKeys() {
    return Keychain.getKeys().then(function(keys){
      this._keys = keys;
    }.bind(this))
  }

  keys() {
    if(!this._keys) {
      // console.log("===Warning: Keys not loaded===")
    }
    return this._keys;
  }

  login = (email, inputtedPassword, server, callback) => {
    this.server = server;

    var root = this;

    this.getAuthParams(email, function(authParams, error){
      if(error) {
        callback(null, error);
        return;
      }

      Crypto.generateKeys(inputtedPassword, authParams, function(keys){

        root.performLoginRequest(email, keys.pw, server, async function(response, error) {
          if(error) {
            callback(null, error);
            return;
          }

          if(response.user) {
            await root.saveAuthParameters(response.user, response.token, email, server, authParams, keys);
          }
          callback(response.user, error);
        })
      });
    })
  }

  async performLoginRequest(email, pw, server, callback) {
    var url = await this.urlForPath("auth/sign_in");
    Server.getInstance().postAbsolute(url, {email: email, password: pw}, function(response){
      callback(response, null);
    }, function(error){
      callback(null, error.error);
    })
  }

  async saveAuthParameters(user, token, email, server, authParams, keys) {
    try {
      this._keys = keys;
      this.user = user;

      return await Promise.all([
        Keychain.setKeys(_.merge(keys, {jwt: token})),
        Storage.setItem("user", JSON.stringify(user)),
        Storage.setItem("auth_params", JSON.stringify(authParams)),
        Storage.setItem("jwt", token),
        Storage.setItem("server", server),
      ]);

    } catch(e) {
      console.log("Error saving auth paramters", e);
      return null;
    }
  }

  async getAuthParams(email, callback) {
    var url = await this.urlForPath("auth/params");
    Server.getInstance().getAbsolute(url, {email: email}, function(response){
      callback(response, null);
    }, function(response){
      console.log("Error getting auth params", response);
      callback(null, response.error);
    })
  }

  signout(callback) {
    this._keys = null;
    this.user = null;
    this.authParams = null;

    Keychain.clearKeys();
    ModelManager.getInstance().handleSignout();

    DBManager.clearAllItems(function(){
      Sync.getInstance().handleSignout();

      this.signoutObservers.forEach(function(observer){
        observer();
      })

      if(callback) {
        callback();
      }
    }.bind(this));
  }

}
