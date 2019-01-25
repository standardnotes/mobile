import ModelManager from "@SFJS/modelManager";
import Sync from "@SFJS/syncManager";
import Storage from "@SFJS/storageManager";
import Auth from "@SFJS/authManager";
import PrivilegesManager from "@SFJS/privilegesManager"
var base64 = require('base-64');

export default class MigrationManager extends SFMigrationManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new MigrationManager();
    }

    return this.instance;
  }

  constructor(modelManager, syncManager, storageManager) {
    super(ModelManager.get(), Sync.get(), Storage.get());
  }

  load() {
    // Doesn't do anything, just gives consumer reason to call MigrationManager.get() so constructor
    // can be run, which handles the actual loading
  }

  registeredMigrations() {
    return [
      this.downloadPrivileges(),
      this.downloadSmartTags()
    ];
  }

  /*
  Previously the mobile app only accepted a certain subset of item content_types before mapping
  them from a sync request. SN|Privileges was not one of them, so now, we need to download all items
  of a user to get at the privileges.
  */

  downloadPrivileges() {
    let contentType = "SN|Privileges";
    return {
      name: "dl-all-to-get-privs",
      runOnlyOnce: true,
      customHandler: async () => {
        if(Auth.get().offline()) {
          return;
        }

        let options = { contentType: contentType };

        // The user is signed in
        Sync.get().stateless_downloadAllItems(options).then((items) => {
          let matchingPrivs = items.filter((candidate) => {
            return candidate.content_type == contentType;
          });

          if(matchingPrivs.length == 0) {
            return;
          }

          let mapped = ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(
            matchingPrivs, null, SFModelManager.MappingSourceRemoteRetrieved);
          // Singleton manager usually resolves singletons on sync completion callback,
          // but since we're manually mapping, we have to make it manually resolve singletons
          PrivilegesManager.get().singletonManager.resolveSingletons(mapped);
        })
      }
    }
  }

  downloadSmartTags() {
    let contentType = "SN|SmartTag";
    return {
      name: "dl-smart-tags",
      runOnlyOnce: true,
      customHandler: async () => {
        if(Auth.get().offline()) {
          return;
        }

        let options = { contentType: contentType };

        // The user is signed in
        Sync.get().stateless_downloadAllItems(options).then((items) => {
          let matchingTags = items.filter((candidate) => {
            return candidate.content_type == contentType;
          });

          if(matchingTags.length == 0) {
            return;
          }

          ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(
            matchingTags, null, SFModelManager.MappingSourceRemoteRetrieved);
        })
      }
    }
  }

  /* Overrides */

  async encode(text) {
    return base64.encode(text);
  }

  async decode(base64String) {
    return base64.decode(base64String);
  }
}
