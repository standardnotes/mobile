import Crypto from './crypto'
import Server from './server'
import Storage from './storage'
import DBManager from './dbManager'
import Sync from './sync'
import ModelManager from './modelManager'
import {Platform} from 'react-native';

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
    loadUser = async () => {
      try {
        var userData = await Storage.getItem("user");
        if(userData) {
          this.user = JSON.parse(userData);

          Sync.getInstance().sync(function(){

          })
        }
      } catch(e) {

      }
    }

    loadUser();
    this.signoutObservers = [];
  }

  onSignOut(callback) {
    this.signoutObservers.push(callback);
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
    return !this.user;
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

  async keys() {
    if(this._keys) {
      return this._keys;
    }

    var result = await Promise.all([
      Storage.getItem("mk"),
      Storage.getItem("ak")
    ]);

    var mk = result[0];
    var ak = result[1];

    if(!mk) {
      return null;
    }

    this._keys = {mk: mk, ak: ak};
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

  async saveKeys(keys) {
    return await Promise.all([
      Storage.setItem("pw", keys.pw),
      Storage.setItem("mk", keys.mk),
      Storage.setItem("ak", keys.ak)
    ]);
  }

  async saveAuthParameters(user, token, email, server, authParams, keys) {
    try {
      await this.saveKeys(keys);
      this.user = user;

      return await Promise.all([
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
