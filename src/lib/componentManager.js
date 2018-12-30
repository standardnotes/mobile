/* This domain will be used to save context item client data */
let ClientDataDomain = "org.standardnotes.sn.components";

import StyleKit from '../style/StyleKit'
import ModelManager from './sfjs/modelManager'
import Sync from './sfjs/syncManager'
import SF from "./sfjs/sfjs"
import ApplicationState from "../ApplicationState"

export default class ComponentManager {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new ComponentManager();
    }

    return this.instance;
  }

  constructor() {
    this.streamObservers = [];
    this.contextStreamObservers = [];
    this.activeComponents = [];

    // this.loggingEnabled = true;

    this.handlers = [];

    ModelManager.get().addItemSyncObserver("component-manager", "*", (allItems, validItems, deletedItems, source) => {

      /* If the source of these new or updated items is from a Component itself saving items, we don't need to notify
        components again of the same item. Regarding notifying other components than the issuing component, other mapping sources
        will take care of that, like ModelManager.MappingSourceRemoteSaved
       */
      if(source == SFModelManager.MappingSourceComponentRetrieved) {
        return;
      }

      for(let observer of this.contextStreamObservers) {
        for(let handler of this.handlers) {
          if(!handler.areas.includes(observer.component.area) && !handler.areas.includes("*")) {
            continue;
          }
          if(handler.contextRequestHandler) {
            var itemInContext = handler.contextRequestHandler(observer.component);
            if(itemInContext) {
              var matchingItem = _.find(allItems, {uuid: itemInContext.uuid});
              if(matchingItem) {
                this.sendContextItemInReply(observer.component, matchingItem, observer.originalMessage, source);
              }
            }
          }
        }
      }
    });
  }

  contextItemDidChangeInArea(area) {
    for(let handler of this.handlers) {
      if(handler.areas.includes(area) === false && !handler.areas.includes("*")) {
        continue;
      }
      var observers = this.contextStreamObservers.filter(function(observer){
        return observer.component.area === area;
      })

      for(let observer of observers) {
        if(handler.contextRequestHandler) {
          var itemInContext = handler.contextRequestHandler(observer.component);
          this.sendContextItemInReply(observer.component, itemInContext, observer.originalMessage);
        }
      }
    }
  }

  jsonForItem(item, component, source) {
    var params = {uuid: item.uuid, content_type: item.content_type, created_at: item.created_at, updated_at: item.updated_at, deleted: item.deleted};
    params.content = item.createContentJSONFromProperties();
    params.clientData = item.getDomainDataItem(component.getClientDataKey(), ClientDataDomain) || {};

    /* This means the this function is being triggered through a remote Saving response, which should not update
      actual local content values. The reason is, Save responses may be delayed, and a user may have changed some values
      in between the Save was initiated, and the time it completes. So we only want to update actual content values (and not just metadata)
      when its another source, like ModelManager.MappingSourceRemoteRetrieved.

      3/7/18: Add MappingSourceLocalSaved as well to handle fully offline saving. github.com/standardnotes/forum/issues/169
     */
    if(source && (source == SFModelManager.MappingSourceRemoteSaved || source == SFModelManager.MappingSourceLocalSaved)) {
      params.isMetadataUpdate = true;
    }
    this.removePrivatePropertiesFromResponseItems([params], component);
    return params;
  }

  sendItemsInReply(component, items, message, source) {
    if(this.loggingEnabled) {console.log("Web|componentManager|sendItemsInReply", component.name, items, message)};
    var response = {items: {}};
    var mapped = items.map(function(item) {
      return this.jsonForItem(item, component, source);
    }.bind(this));

    response.items = mapped;
    this.replyToMessage(component, message, response);
  }

  sendContextItemInReply(component, item, originalMessage, source) {
    if(this.loggingEnabled) {console.log("Web|componentManager|sendContextItemInReply", component.name, item, originalMessage)};
    var response = {item: this.jsonForItem(item, component, source)};
    this.replyToMessage(component, originalMessage, response);
  }

  replyToMessage(component, originalMessage, replyData) {
    var reply = {
      action: "reply",
      original: originalMessage,
      data: replyData
    }

    this.sendMessageToComponent(component, reply);
  }

  sendMessageToComponent(component, message) {
    let permissibleActionsWhileHidden = ["component-registered", "themes"];
    if(component.hidden && !permissibleActionsWhileHidden.includes(message.action)) {
      if(this.loggingEnabled) {
        console.log("Component disabled for current item, not sending any messages.", component.name);
      }
      return;
    }

    if(this.loggingEnabled) {
      console.log("Web|sendMessageToComponent", component.name, JSON.stringify(message));
    }
    component.window.postMessage(JSON.stringify(message));
  }

  get components() {
    return ModelManager.get().allItemsMatchingTypes(["SN|Component", "SN|Theme"]);
  }

  componentsForArea(area) {
    return this.components.filter(function(component){
      return component.area === area;
    })
  }

  urlForComponent(component) {
    var localReplacement = ApplicationState.isIOS ? "localhost" : "10.0.2.2";
    var url = component.hosted_url || component.url;
    if(url) {
      url = url.replace("localhost", localReplacement).replace("sn.local", localReplacement);
    }
    return url;
  }

  componentForUrl(url) {
    return this.components.filter(function(component){
      return component.url === url || component.hosted_url === url;
    })[0];
  }

  componentForSessionKey(key) {
    return _.find(this.components, {sessionKey: key});
  }

  isReadOnlyMessage(message)  {
    let writeActions = ["save-items", "delete-items", "create-item"]
    // Ensure the message action is not one of the writeActions
    return !writeActions.includes(message.action);
  }

  handleMessage(component, message) {

    if(!component) {
      if(this.loggingEnabled) {
        console.log("Component not defined, returning");
      }
      return;
    }

    /**
    Mobile only handles a subset of possible messages.
    Possible Messages:
      set-component-data
      stream-context-item
      save-items


    */

    if(message.action === "stream-context-item") {
      this.handleStreamContextItemMessage(component, message);
    } else if(message.action === "set-component-data") {
      this.handleSetComponentDataMessage(component, message);
    } else if(message.action === "save-items") {
      this.handleSaveItemsMessage(component, message);
    }

    // Notify observers
    for(let handler of this.handlers) {
      if(handler.areas.includes(component.area) || handler.areas.includes("*")) {
        setTimeout(function () {
          handler.actionHandler && handler.actionHandler(component, message.action, message.data);
        }, 10);
      }
    }
  }

  removePrivatePropertiesFromResponseItems(responseItems, component, options = {}) {
    // Don't allow component to overwrite these properties.
    var privateProperties = ["autoupdateDisabled", "permissions", "active"];
    if(options) {
      if(options.includeUrls) { privateProperties = privateProperties.concat(["url", "hosted_url", "local_url"])}
    }
    for(var responseItem of responseItems) {
      // Do not pass in actual items here, otherwise that would be destructive.
      // Instead, generic JS/JSON objects should be passed.
      for(var prop of privateProperties) {
        delete responseItem.content[prop];
      }
    }
  }

  handleStreamContextItemMessage(component, message) {

    if(!_.find(this.contextStreamObservers, {identifier: component.uuid})) {
      // for pushing laster as changes come in
      this.contextStreamObservers.push({
        identifier: component.uuid,
        component: component,
        originalMessage: message
      })
    }

    // push immediately now
    for(let handler of this.handlersForArea(component.area)) {
      if(handler.contextRequestHandler) {
        var itemInContext = handler.contextRequestHandler(component);
        this.sendContextItemInReply(component, itemInContext, message);
      }
    }
  }

  isItemWithinComponentContextJurisdiction(item, component) {
    for(let handler of this.handlersForArea(component.area)) {
      if(handler.contextRequestHandler) {
        var itemInContext = handler.contextRequestHandler(component);
        if(itemInContext && itemInContext.uuid == item.uuid) {
          return true;
        }
      }
    }
    return false;
  }

  handlersForArea(area) {
    return this.handlers.filter((candidate) => {return candidate.areas.includes(area)});
  }

  handleSaveItemsMessage(component, message) {
    var responseItems = message.data.items;

    // Ensure you're just trying to save the context item
    if(!(responseItems.length == 1 && this.isItemWithinComponentContextJurisdiction(responseItems[0], component))) {
      return;
    }

    this.removePrivatePropertiesFromResponseItems(responseItems, component, {includeUrls: true});

    /*
    We map the items here because modelManager is what updates the UI. If you were to instead get the items directly,
    this would update them server side via sync, but would never make its way back to the UI.
    */
    var localItems = ModelManager.get().mapResponseItemsToLocalModels(responseItems, SFModelManager.MappingSourceComponentRetrieved);

    for(var item of localItems) {
      var responseItem = _.find(responseItems, {uuid: item.uuid});
      _.merge(item.content, responseItem.content);
      if(responseItem.clientData) {
        item.setDomainDataItem(component.url || component.uuid, responseItem.clientData, ClientDataDomain);
      }
      item.setDirty(true);
    }

    Sync.get().sync().then((response) => {
      // Allow handlers to be notified when a save begins and ends, to update the UI
      var saveMessage = Object.assign({}, message);
      saveMessage.action = (response && response.error) ? "save-error" : "save-success";
      this.replyToMessage(component, message, {error: response && response.error})
      this.handleMessage(component, saveMessage);
    });
  }

  handleSetComponentDataMessage(component, message) {
    component.componentData = message.data.componentData;
    component.setDirty(true);
    Sync.get().sync();
  }

  registerHandler(handler) {
    this.handlers.push(handler);
  }

  deregisterHandler(identifier) {
    var handler = _.find(this.handlers, {identifier: identifier});
    this.handlers.splice(this.handlers.indexOf(handler), 1);
  }

  // Called by other views when the iframe is ready
  async registerComponentWindow(component, componentWindow) {
    if(!component) { console.error("component is null");}
    if(!componentWindow) { console.error("componentWindow is null");}

    if(component.window === componentWindow) {
      if(this.loggingEnabled) {
        console.log("Web|componentManager", "attempting to re-register same component window.")
      }
    }

    if(this.loggingEnabled) {
      console.log("Web|componentManager|registerComponentWindow");
    }

    component.window = componentWindow;
    component.sessionKey = await SF.get().crypto.generateUUID();

    this.sendMessageToComponent(component, {
      action: "component-registered",
      sessionKey: component.sessionKey,
      componentData: component.componentData,
      data: {
        uuid: component.uuid,
        environment: "mobile"
      }
    });

    this.postActiveThemeToComponent(component);
  }

  deactivateComponent(component, dontSync = false) {
    component.active = false;
    component.sessionKey = null;

    this.streamObservers = this.streamObservers.filter(function(o){
      return o.component !== component;
    })

    this.contextStreamObservers = this.contextStreamObservers.filter(function(o){
      return o.component !== component;
    })
  }

  getActiveTheme() {
    return this.componentsForArea("themes").find((theme) => {return theme.active});
  }

  postActiveThemeToComponent(component) {
    var activeTheme = StyleKit.get().activeTheme;

    var data = {
      themes: [(activeTheme && !activeTheme.default) ? this.urlForComponent(activeTheme) : null]
    }

    this.sendMessageToComponent(component, {action: "themes", data: data})
  }

  getEditors() {
    return this.componentsForArea("editor-editor");
  }

  getDefaultEditor() {
    return this.getEditors().filter((e) => {return e.content.isMobileDefault})[0];
  }

  editorForNote(note) {
    let editors = ModelManager.get().validItemsForContentType("SN|Component").filter(function(component){
      return component.area == "editor-editor";
    })

    for(var editor of editors) {
      if(editor.isExplicitlyEnabledForItem(note)) {
        return editor;
      }
    }

    // No editor found for note. Use default editor, if note does not prefer system editor
    if(!note.content.mobilePrefersPlainEditor) {
      return editors.filter((e) => {return e.content.isMobileDefault})[0];
    }
  }

  setEditorAsMobileDefault(editor, isDefault) {
    editor.content.isMobileDefault = isDefault;
    editor.setDirty(true);
    Sync.get().sync();
  }

  associateEditorWithNote(editor, note) {
    var currentEditor = this.editorForNote(note);
    if(currentEditor && currentEditor !== editor) {
      // Disassociate currentEditor with note
      currentEditor.associatedItemIds = currentEditor.associatedItemIds.filter((id) => {return id !== note.uuid});

      if(!currentEditor.disassociatedItemIds.includes(note.uuid)) {
        currentEditor.disassociatedItemIds.push(note.uuid);
      }

      currentEditor.setDirty(true);
    }

    if(editor) {
      if(note.content.mobilePrefersPlainEditor == true) {
        note.content.mobilePrefersPlainEditor = false;
        note.setDirty(true);
      }

      editor.disassociatedItemIds = editor.disassociatedItemIds.filter((id) => {return id !== note.uuid});

      if(!editor.associatedItemIds.includes(note.uuid)) {
        editor.associatedItemIds.push(note.uuid);
      }

      editor.setDirty(true);
    } else {
      // Note prefers plain editor
      if(!note.content.mobilePrefersPlainEditor) {
        note.content.mobilePrefersPlainEditor = true;
        note.setDirty(true);
      }
    }

    Sync.get().sync();
  }

  clearEditorForNote(note) {
    this.associateEditorWithNote(null, note);
  }
}
