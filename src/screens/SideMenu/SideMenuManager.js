import React, { Component, Fragment } from 'react';
import { ScrollView, View, Text, FlatList } from 'react-native';

import ApplicationState from "@Lib/ApplicationState"

/*
  Because SideMenus (SideMenu and NoteSideMenu) are rendering by React Navigation as drawer components
  on app startup, we can't give them params at will. We need a way for components like the Compose
  screen to talk to the NoteSideMenu and give it the current note context. The only way seems to be
  some shared singleton object, which is this.

  This object will handle state for both side menus.
*/

export default class SideMenuManager {

  static instance = null;
  static get() {
    if (this.instance == null) {
      this.instance = new SideMenuManager();
    }

    return this.instance;
  }

  setLeftSideMenuReference(ref) {
    // The ref handler of the main component sometimes passes null, then passes the correct reference
    if(!this.leftSideMenu) {
      this.leftSideMenu = ref;
    }
  }

  setRightSideMenuReference(ref) {
    // The ref handler of the main component sometimes passes null, then passes the correct reference
    if(!this.rightSideMenu) {
      this.rightSideMenu = ref;
    }
  }

  /*
    @param handler.onEditorSelect
    @param handler.onTagSelect
    @param handler.getSelectedTags
  */
  setHandlerForLeftSideMenu(handler) {
    this.leftSideMenuHandler = handler;
  }

  /*
    @param handler.onTagSelect
    @param handler.getSelectedTags
    @param handler.getCurrentNote
  */
  setHandlerForRightSideMenu(handler) {
    this.rightSideMenuHandler = handler;

    this.rightSideMenu && this.rightSideMenu.forceUpdate();
  }

  getHandlerForLeftSideMenu() {
    return this.leftSideMenuHandler;
  }

  getHandlerForRightSideMenu() {
    return this.rightSideMenuHandler;
  }

  removeHandlerForRightSideMenu() {
    this.rightSideMenuHandler = null;
  }

  setLockedForLeftSideMenu(locked) {
    this.leftSideMenuLocked = locked;
  }

  setLockedForRightSideMenu(locked) {
    this.rightSideMenuLocked = locked;
  }

  isLeftSideMenuLocked() {
    return this.leftSideMenuLocked;
  }

  isRightSideMenuLocked() {
    return this.rightSideMenuLocked;
  }

}
