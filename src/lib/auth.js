import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import DBManager from './dbManager'
import Sync from './sync'
import ModelManager from './modelManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
import KeysManager from "./keysManager"
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
    if (__DEV__) {
      if(Platform.OS === "android") {
        return "http://10.0.2.2:3000/"
      } else {
        return "http://localhost:3000/"
      }
    } else {
      return "https://sync.standardnotes.org";
    }
  }

  constructor() {
    this.signoutObservers = [];
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
    // an offline user could have keys saved if using passcode lock
    var keys = KeysManager.get().activeKeys() || {};
    return !keys.jwt;
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

    var keys = KeysManager.get().activeKeys();
    if(keys && keys.ak) {
      return "002";
    } else {
      return "001";
    }
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

        root.performLoginRequest(email, keys.pw, async function(response, error) {
          if(error) {
            callback(null, error);
            return;
          }

          if(response.user) {
            await root.saveAuthParameters({token: response.token, email: email, server: server, authParams: authParams, keys: keys});
          }
          callback(response.user, error);
        })
      });
    })
  }

  register = async (email, inputtedPassword, server, callback) => {
    this.server = server;

    var root = this;

    var pw_nonce = await Crypto.generateRandomKey(512);
    var pw_salt = await Crypto.sha256([email, pw_nonce].join(":"));

    var authParams = {
      pw_cost: 103000,
      pw_salt: pw_salt
    }

    Crypto.generateKeys(inputtedPassword, authParams, function(keys){

      root.performRegistrationRequest(email, keys.pw, authParams, async function(response, error) {
        if(error) {
          callback(null, error);
          return;
        }

        if(response.user) {
          await root.saveAuthParameters({token: response.token, email: email, server: server, authParams: authParams, keys: keys});
        }
        callback(response.user, error);
      })
    });
  }

  async performLoginRequest(email, pw, callback) {
    var url = await this.urlForPath("auth/sign_in");
    Server.getInstance().postAbsolute(url, {email: email, password: pw}, function(response){
      callback(response, null);
    }, function(error){
      callback(null, error.error);
    })
  }

  async performRegistrationRequest(email, pw, authParams, callback) {
    var url = await this.urlForPath("auth/");
    Server.getInstance().postAbsolute(url, _.merge({email: email, password: pw}, authParams), function(response){
      callback(response, null);
    }, function(error){
      callback(null, error.error);
    })
  }

  async saveAuthParameters({token, email, server, authParams, keys} = {}) {
    try {
      this._keys = keys;

      return await Promise.all([
        KeysManager.get().persistAccountKeys(_.merge(keys, {jwt: token})),
        KeysManager.get().setAccountAuthParams(authParams),
        Storage.setItem("server", server),
        Storage.setItem("email", email),
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
      var error = response.error || {message: response};
      callback(null, error);
    })
  }

  signout(callback) {
    this.authParams = null;

    ModelManager.getInstance().handleSignout();
    KeysManager.get().clearAccountKeysAndData();

    DBManager.clearAllItems(function(){
      Sync.getInstance().handleSignout();

      this.signoutObservers.forEach(function(observer){
        observer.callback();
      })

      if(callback) {
        callback();
      }
    }.bind(this));
  }

}
