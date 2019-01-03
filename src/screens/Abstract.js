import React, { Component } from 'react';
import {DeviceEventEmitter, Modal, View, Text} from 'react-native';
import StyleKit from "../style/StyleKit";
import ApplicationState from "@Lib/ApplicationState"
import HeaderTitleView from "../components/HeaderTitleView"
import HeaderButtons, { HeaderButton, Item } from 'react-navigation-header-buttons';
import Icon from 'react-native-vector-icons/Ionicons';
import ThemedComponent from "@Components/ThemedComponent";
import PrivilegesManager from "@SFJS/privilegesManager"

const IoniconsHeaderButton = passMeFurther => (
  // the `passMeFurther` variable here contains props from <Item .../> as well as <HeaderButtons ... />
  // and it is important to pass those props to `HeaderButton`
  // then you may add some information like icon size or color (if you use icons)
  <HeaderButton {...passMeFurther} IconComponent={Icon} iconSize={30} color={StyleKit.variable("stylekitInfoColor")} />
);

export default class Abstract extends ThemedComponent {

  static getDefaultNavigationOptions = ({ navigation, navigationOptions, templateOptions }) => {
    // templateOptions allow subclasses to specifiy things they want to display in nav bar before it actually loads.
    // this way, things like title and the Done button in the top left are visible during transition
    if(!templateOptions) { templateOptions = {}; }
    let options = {
      headerTitle:<HeaderTitleView title={navigation.getParam("title") || templateOptions.title} subtitle={navigation.getParam("subtitle") || templateOptions.subtitle}/>,
      headerStyle: {
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        borderBottomColor: StyleKit.variables.stylekitContrastBorderColor,
        borderBottomWidth: 1
      },
      headerTintColor: StyleKit.variable("stylekitInfoColor")
    }

    let headerLeft, headerRight;
    let leftButton = navigation.getParam('leftButton') || templateOptions.leftButton;
    if(leftButton) {
      headerLeft = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <Item disabled={leftButton.disabled} title={leftButton.title} iconName={leftButton.iconName} onPress={leftButton.onPress} />
        </HeaderButtons>
      )

      options.headerLeft = headerLeft;
    }

    let rightButton = navigation.getParam('rightButton') || templateOptions.rightButton;
    if(rightButton) {
      headerRight = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <Item disabled={rightButton.disabled} title={rightButton.title} iconName={rightButton.iconName} onPress={rightButton.onPress} />
        </HeaderButtons>
      )

      options.headerRight = headerRight;
    }

    return options;
  }

  static navigationOptions = ({ navigation, navigationOptions }) => {
    return Abstract.getDefaultNavigationOptions({navigation, navigationOptions});
  };

  constructor(props) {
    super(props);

    this.state = {lockContent: true};

    this.listeners = [
      this.props.navigation.addListener('willFocus', payload => {this.componentWillFocus();}),
      this.props.navigation.addListener('didFocus', payload => {this.componentDidFocus();}),
      this.props.navigation.addListener('willBlur', payload => {this.componentWillBlur();}),
      this.props.navigation.addListener('didBlur', payload => {this.componentDidBlur();})
    ];

    this._stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(!this.isMounted()) {
        return;
      }

      if(state == ApplicationState.Unlocking) {
        this.unlockContent();
      }

      if(state == ApplicationState.Locking) {
        this.lockContent();
      }
    })
  }

  onThemeChange() {
    super.onThemeChange();
    try {
      // Navigator doesnt really use activeTheme. We pass it here just as a way to trigger
      // navigationOptions to reload.
      this.props.navigation.setParams({activeTheme: StyleKit.get().activeTheme});
    } catch {

    }
  }

  componentWillUnmount() {
    this.willUnmount = true;
    this.mounted = false;
    for(var listener of this.listeners) {
      listener.remove();
    }
    ApplicationState.get().removeStateObserver(this._stateObserver);
    this.componentDidBlur(); // This is not called automatically when the component unmounts. https://github.com/react-navigation/react-navigation/issues/4003
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);

    if(ApplicationState.get().isUnlocked() && !this.loadedInitialState) {
      this.loadInitialState();
    }

    if(this._renderOnMount) {
      this._renderOnMount = false;
      this.forceUpdate();

      this._renderOnMountCallback && this._renderOnMountCallback();
      this._renderOnMountCallback = null;
    }
  }

  loadInitialState() {
    this.loadedInitialState = true;
    this.configureNavBar(true);
  }

  componentWillFocus() {
    if(ApplicationState.get().isUnlocked() && this.state.lockContent) {
      this.unlockContent();
    }
  }

  componentDidFocus() {
    this.visible = true;
    this.willBeVisible = true; // Just in case willAppear isn't called for whatever reason
    this.configureNavBar(false);
  }

  componentWillBlur() {

  }

  componentDidBlur() {
    this.willBeVisible = false;
    this.visible = false;
  }

  getProp = (prop) => {
    // this.props.navigation could be undefined if we're in the drawer
    return this.props.navigation.getParam && this.props.navigation.getParam(prop);
  }

  setTitle(title, subtitle) {
    let options = {};
    options.title = title;
    options.subtitle = subtitle;
    this.props.navigation.setParams(options);
  }

  lockContent() {
    this.mergeState({lockContent: true});
    this.configureNavBar();
  }

  unlockContent() {
    if(!this.loadedInitialState) {
      this.loadInitialState();
    }
    this.mergeState({lockContent: false});
  }

  constructState(state) {
    this.state = _.merge({lockContent: ApplicationState.get().isLocked()}, state);
  }

  mergeState(state) {
    this.setState(function(prevState){
      return _.merge(prevState, state);
    })
  }

  renderOnMount(callback) {
    if(this.isMounted()) {
      this.forceUpdate();
      callback && callback();
    } else {
      this._renderOnMount = true;
      this._renderOnMountCallback = callback;
    }
  }

  isMounted() {
    return this.mounted;
  }

  configureNavBar(initial) {

  }

  popToRoot() {
    this.props.navigation.popToTop();
  }

  dismiss() {
    /*
      the `null` parameter is actually very important: https://reactnavigation.org/docs/en/navigation-prop.html#goback-close-the-active-screen-and-move-back
    */
    this.props.navigation.goBack(null);
  }

  async handlePrivilegedAction(isProtected, action, run) {
    if(isProtected) {
      let actionRequiresPrivs = await PrivilegesManager.get().actionRequiresPrivilege(action);
      if(actionRequiresPrivs) {
        PrivilegesManager.get().presentPrivilegesModal(action, this.props.navigation, () => {
          run();
        });
      } else {
        run();
      }
    } else {
      run();
    }
  }

  static IsShallowEqual = (newObj, prevObj, keys) => {
    for(var key of keys) {
      if(newObj[key] !== prevObj[key]) {
        return false;
      }
    }
    return true;
  }
}
