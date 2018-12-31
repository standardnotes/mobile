import React, { Component, Fragment } from 'react';
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
    return !isSame;
  }


}
