import SF from './sfjs'
import Server from './server'
import Storage from './storage'
import Sync from './sync'
import ModelManager from './modelManager'
import AlertManager from './alertManager'
import {Platform} from 'react-native';
import Keychain from "./keychain"
import KeysManager from "./keysManager"

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
      // If there's no version stored, and there's an ak, it has to be 002. Newer versions would have thier version stored in authParams.
      return "002";
    } else {
      return "001";
    }
  }

  validateLogin = (authParams, strictSignIn, callback) => {
    if(!SF.get().supportedVersions().includes(authParams.version)) {
      var message;
      if(SF.get().isVersionNewerThanLibraryVersion(authParams.version)) {
        // The user has a new account type, but is signing in to an older client.
        message = "This version of the application does not support your newer account type. Please upgrade to the latest version of Standard Notes to sign in.";
      } else {
        // The user has a very old account type, which is no longer supported by this client
        message = "The protocol version associated with your account is outdated and no longer supported by this application. Please visit standardnotes.org/help/security for more information.";
      }
      callback({message: message});
      return;
    }

    // need to put this in a block due to asyncrounous confirm alert
    var otherValidation = () => {
      var minimum = SF.get().costMinimumForVersion(authParams.version);
      if(authParams.pw_cost < minimum) {
        let message = "Unable to login due to insecure password parameters. Please visit standardnotes.org/help/security for more information.";
        callback({message: message});
        return;
      }

      if(strictSignIn) {
        // Refuse sign in if authParams.version is anything but the latest version
        var latestVersion = SF.get().version();
        if(authParams.version !== latestVersion) {
          let message = `Strict sign in refused server sign in parameters. The latest security version is ${latestVersion}, but your account is reported to have version ${authParams.version}. If you'd like to proceed with sign in anyway, please disable strict sign in and try again.`;
          callback({message: message});
          return;
        }
      }
      callback(null);
    }

    if(SF.get().isProtocolVersionOutdated(authParams.version)) {
      let message = `The encryption version for your account, ${authParams.version}, is outdated and requires upgrade. You may proceed with login, but are advised to perform a security update using the web or desktop application. Please visit standardnotes.org/help/security for more information.`
      AlertManager.get().confirm({
        title: "Update Needed",
        text: message,
        confirmButtonText: "Sign In",
        onConfirm: () => {
          otherValidation();
        },
        onCancel: () => {
          callback({});
        }
      })
      return;
    } else {
      otherValidation();
    }
  }

  login = (email, inputtedPassword, server, strictSignIn, extraParams, callback) => {

    this.postEvent(Auth.WillSignInEvent);

    var root = this;

    this.getAuthParams(email, server, extraParams, (authParams, error) => {
      if(error) {
        callback(null, error);
        return;
      }

      authParams.identifier = email;

      this.validateLogin(authParams, strictSignIn, (validationError) => {
        if(validationError) {
          callback(null, validationError);
          return;
        }

        SF.get().crypto().computeEncryptionKeysForUser(inputtedPassword, authParams).then((keys) => {
          root.performLoginRequest(email, keys.pw, server, extraParams, async (response, error) => {
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
      });

    })
  }

  register = async (email, inputtedPassword, server, callback) => {
    var root = this;

    // if(__DEV__) { authParams.pw_cost = 3000; }

    SF.get().crypto().generateInitialKeysAndAuthParamsForUser(email, inputtedPassword).then((results) => {
      let keys = results.keys;
      let authParams = results.authParams;

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

  async performLoginRequest(email, pw, server, extraParams, callback) {
    var url = this.urlForPath("auth/sign_in", server);
    Server.get().postAbsolute(url, _.merge({email: email, password: pw}, extraParams), function(response){
      callback(response, null);
    }, function(error){
      callback(null, error.error);
    })
  }

  async performRegistrationRequest(email, pw, authParams, server, callback) {
    var url = this.urlForPath("auth/", server);
    Server.get().postAbsolute(url, _.merge({email: email, password: pw}, authParams), function(response){
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

  async getAuthParams(email, server, extraParams, callback) {
    var url = this.urlForPath("auth/params", server);
    Server.get().getAbsolute(url, _.merge({email: email}, extraParams), (response) => {
      callback(response, null);
    }, (response) => {
      console.log("Error getting auth params", response);
      var error = response.error || {message: response};
      callback(null, error);
    })
  }

  signout() {
    ModelManager.get().handleSignout();
    KeysManager.get().clearAccountKeysAndData();

    return Storage.get().clearAllModels().then(() => {
      Sync.get().handleSignout();
      this.postEvent(Auth.DidSignOutEvent);
    });
  }

  postEvent(event) {
    this.eventSubscribers.forEach(function(observer){
      if(observer.events.includes(event)) {
        observer.callback(event);
      }
    })
  }

}
