import Auth from '@SFJS/authManager';
import ModelManager from '@SFJS/modelManager';
import PrivilegesManager from '@SFJS/privilegesManager';
import Storage from '@SFJS/storageManager';
import Sync from '@SFJS/syncManager';

import { SFModelManager, SFMigrationManager } from 'standard-file-js';

const base64 = require('base-64');

export default class MigrationManager extends SFMigrationManager {
  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new MigrationManager();
    }

    return this.instance;
  }

  constructor(modelManager, syncManager, storageManager, authManager) {
    super(ModelManager.get(), Sync.get(), Storage.get(), Auth.get());
  }

  load() {
    // Doesn't do anything, just gives consumer reason to call MigrationManager.get() so constructor
    // can be run, which handles the actual loading
  }

  registeredMigrations() {
    return [this.downloadPrivileges(), this.downloadSmartTags()];
  }

  /*
  Previously the mobile app only accepted a certain subset of item content_types before mapping
  them from a sync request. SN|Privileges was not one of them, so now, we need to download all items
  of a user to get at the privileges.
  */

  downloadPrivileges() {
    let contentType = 'SN|Privileges';
    return {
      name: 'dl-all-to-get-privs',
      runOnlyOnce: true,
      customHandler: async () => {
        if (Auth.get().offline()) {
          return;
        }

        let options = { contentType: contentType };

        // The user is signed in
        Sync.get()
          .stateless_downloadAllItems(options)
          .then(async items => {
            const matchingPrivs = items.filter(candidate => {
              return candidate.content_type === contentType;
            });

            if (matchingPrivs.length === 0) {
              return;
            }

            const mapped = await ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(
              matchingPrivs,
              null,
              SFModelManager.MappingSourceRemoteRetrieved
            );
            // Singleton manager usually resolves singletons on sync completion callback,
            // but since we're manually mapping, we have to make it manually resolve singletons
            PrivilegesManager.get().singletonManager.resolveSingletons(mapped);
          });
      },
    };
  }

  downloadSmartTags() {
    const contentType = 'SN|SmartTag';
    return {
      name: 'dl-smart-tags',
      runOnlyOnce: true,
      customHandler: async () => {
        if (Auth.get().offline()) {
          return;
        }

        const options = { contentType: contentType };

        // The user is signed in
        Sync.get()
          .stateless_downloadAllItems(options)
          .then(async items => {
            let matchingTags = items.filter(candidate => {
              return candidate.content_type === contentType;
            });

            if (matchingTags.length === 0) {
              return;
            }

            await ModelManager.get().mapResponseItemsToLocalModelsOmittingFields(
              matchingTags,
              null,
              SFModelManager.MappingSourceRemoteRetrieved
            );
          });
      },
    };
  }

  /* Overrides */

  async encode(text) {
    return base64.encode(text);
  }

  async decode(base64String) {
    return base64.decode(base64String);
  }
}
