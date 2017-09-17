import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import DBManager from './dbManager'
import Sync from './sync'
import ModelManager from './modelManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
import KeysManager from "./keysManager"
var _ = require('lodash');

let accountRelatedStorageKeys = [];

export default class Auth {

  static instance = null;

  static DidSignOutEvent = "DidSignOutEvent";
  static WillSignInEvent = "WillSignInEvent";
  static DidSignInEvent = "DidSignInEvent";

  static getInstance() {
    if (this.instance == null) {
      this.instance = new Auth();
    }

    return this.instance;
  }

  static _defaultServer() {
    if (__DEV__) {
      if(Platform.OS === "android") {
        return "http://10.0.2.2:3000"
      } else {
        return "http://localhost:3000"
      }
    } else {
      return "https://sync.standardnotes.org";
    }
  }

  constructor() {
    this.eventSubscribers = [];
  }

  addEventObserver(events, callback) {
    var observer = {key: new Date(), events, callback: callback};
    this.eventSubscribers.push(observer);
    return observer;
  }

  removeEventObserver(observer) {
    _.pull(this.eventSubscribers, observer);
  }

  serverUrl() {
    var user = KeysManager.get().user;
    return (user && user.server) || Auth._defaultServer();
  }

  urlForPath(path, serverUrl) {
    function joinPaths(parts){
       var separator = "/";
       var replace = new RegExp(separator+'{1,}', 'g');
       return parts.join(separator).replace(replace, separator);
    }

    if(!serverUrl) {
      serverUrl = this.serverUrl();
    }
    return joinPaths([serverUrl, path]);
  }

  offline() {
    // an offline user could have keys saved if using passcode lock
    var keys = KeysManager.get().activeKeys() || {};
    return !keys.jwt;
  }

  protocolVersion() {
    var authParams = KeysManager.get().activeAuthParams();
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

    this.postEvent(Auth.WillSignInEvent);

    var root = this;

    this.getAuthParams(email, server, function(authParams, error){
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
            await root.saveAuthParameters({token: response.token, email: email, server: server, authParams: authParams, keys: keys});
            root.postEvent(Auth.DidSignInEvent);
          }
          callback(response.user, error);
        })
      });
    })
  }

  register = async (email, inputtedPassword, server, callback) => {
    var root = this;

    var pw_nonce = await Crypto.generateRandomKey(512);
    var pw_salt = await Crypto.sha256([email, pw_nonce].join(":"));

    var authParams = {
      pw_cost: 103000,
      pw_salt: pw_salt
    }

    if(__DEV__) {
      authParams.pw_cost = 3000;
    }

    Crypto.generateKeys(inputtedPassword, authParams, function(keys){

      root.performRegistrationRequest(email, keys.pw, authParams, server, async function(response, error) {
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

  async performLoginRequest(email, pw, server, callback) {
    var url = this.urlForPath("auth/sign_in", server);
    Server.getInstance().postAbsolute(url, {email: email, password: pw}, function(response){
      callback(response, null);
    }, function(error){
      callback(null, error.error);
    })
  }

  async performRegistrationRequest(email, pw, authParams, server, callback) {
    var url = this.urlForPath("auth/", server);
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
        KeysManager.get().saveUser({server: server, email: email})
      ]);

    } catch(e) {
      console.log("Error saving auth paramters", e);
      return null;
    }
  }

  async getAuthParams(email, server, callback) {
    var url = this.urlForPath("auth/params", server);
    Server.getInstance().getAbsolute(url, {email: email}, function(response){
      callback(response, null);
    }, function(response){
      console.log("Error getting auth params", response);
      var error = response.error || {message: response};
      callback(null, error);
    })
  }

  signout(callback) {
    ModelManager.getInstance().handleSignout();
    KeysManager.get().clearAccountKeysAndData();

    DBManager.clearAllItems(function(){
      Sync.getInstance().handleSignout();

      this.postEvent(Auth.DidSignOutEvent);

      if(callback) {
        callback();
      }
    }.bind(this));
  }

  postEvent(event) {
    this.eventSubscribers.forEach(function(observer){
      if(observer.events.includes(event)) {
        observer.callback(event);
      }
    })
  }

}
