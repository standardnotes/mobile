import React, { Component, Fragment } from 'react';
import {Keyboard} from 'react-native';
import Abstract from "@Screens/Abstract"

export default class AbstractSideMenu extends Abstract {

  shouldComponentUpdate(nextProps, nextState) {
    /*
      We had some performance issues with this component rendering too many times when
      navigating to unrelated routes, like pushing Compose. It would render 6 times or so,
      causing slowdown. We only want to render if there's a difference in drawer related properties.
      I've found that when the drawer is about to appear, one of these params will change: "isDrawerIdle", "isDrawerOpen", "isTransitioning"
    */
    let newNavigationState = nextProps.navigation.state;
    let currentNavigationState = this.props.navigation.state;

    // When navigating to Compose from Notes, we don't want this to render. I've found that the drawerMovementDirection is
    // set to 'closing' in this circumstance.
    if(newNavigationState.drawerMovementDirection == "closing" || currentNavigationState.drawerMovementDirection == "closing") {
      return false;
    }
    let isSame = Abstract.IsShallowEqual(newNavigationState, currentNavigationState, ["isDrawerIdle", "isDrawerOpen", "isTransitioning"])
    if(!isSame) {
      this.psuedo_willFocus();
    }
    return !isSame;
  }

  psuedo_willFocus() {
    // componentWillFocus is not called for drawer components when they are about to appear
    // instead, we piggyback on the logic in shouldComponentUpdate above to determine
    // if navigation state is about to change, and if so, we call this.

    Keyboard.dismiss();

    this.handler && this.handler.onKeyboardDismiss && this.handler.onKeyboardDismiss();
  }

}
