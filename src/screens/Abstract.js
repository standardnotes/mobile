import React from 'react';
import HeaderButtons, {
  HeaderButton,
  Item,
} from 'react-navigation-header-buttons';
import _ from 'lodash';
import Icon from 'react-native-vector-icons/Ionicons';
import HeaderTitleView from '@Components/HeaderTitleView';
import ThemedComponent from '@Components/ThemedComponent';
import ApplicationState from '@Lib/ApplicationState';
import PrivilegesManager from '@SFJS/privilegesManager';
import StyleKit from '@Style/StyleKit';

const IoniconsHeaderButton = passMeFurther => (
  // the `passMeFurther` variable here contains props from <Item .../> as well as <HeaderButtons ... />
  // and it is important to pass those props to `HeaderButton`
  // then you may add some information like icon size or color (if you use icons)
  <HeaderButton
    {...passMeFurther}
    IconComponent={Icon}
    iconSize={30}
    color={StyleKit.variables.stylekitInfoColor}
  />
);

export default class Abstract extends ThemedComponent {
  static getDefaultNavigationOptions = ({
    navigation,
    navigationOptions,
    templateOptions,
  }) => {
    // templateOptions allow subclasses to specifiy things they want to display in nav bar before it actually loads.
    // this way, things like title and the Done button in the top left are visible during transition
    if (!templateOptions) {
      templateOptions = {};
    }
    let options = {
      headerTitle: (
        <HeaderTitleView
          title={navigation.getParam('title') || templateOptions.title}
          subtitle={navigation.getParam('subtitle') || templateOptions.subtitle}
          subtitleColor={navigation.getParam('subtitleColor')}
        />
      ),
      headerStyle: {
        backgroundColor: StyleKit.variables.stylekitContrastBackgroundColor,
        borderBottomColor: StyleKit.variables.stylekitContrastBorderColor,
        borderBottomWidth: 1,
      },
      headerTintColor: StyleKit.variables.stylekitInfoColor,
    };

    let headerLeft, headerRight;
    let leftButton =
      navigation.getParam('leftButton') || templateOptions.leftButton;
    if (leftButton) {
      headerLeft = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <Item
            testID="headerButton"
            disabled={leftButton.disabled}
            title={leftButton.title}
            iconName={leftButton.iconName}
            onPress={leftButton.onPress}
          />
        </HeaderButtons>
      );

      options.headerLeft = headerLeft;
    }

    let rightButton =
      navigation.getParam('rightButton') || templateOptions.rightButton;
    if (rightButton) {
      headerRight = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <Item
            disabled={rightButton.disabled}
            title={rightButton.title}
            iconName={rightButton.iconName}
            onPress={rightButton.onPress}
          />
        </HeaderButtons>
      );

      options.headerRight = headerRight;
    }

    return options;
  };

  static navigationOptions = ({ navigation, navigationOptions }) => {
    return Abstract.getDefaultNavigationOptions({
      navigation,
      navigationOptions,
    });
  };

  constructor(props) {
    super(props);

    this.state = { lockContent: true };

    this.listeners = [
      this.props.navigation.addListener('willFocus', payload => {
        this.componentWillFocus();
      }),
      this.props.navigation.addListener('didFocus', payload => {
        this.componentDidFocus();
      }),
      this.props.navigation.addListener('willBlur', payload => {
        this.componentWillBlur();
      }),
      this.props.navigation.addListener('didBlur', payload => {
        this.componentDidBlur();
      }),
    ];

    this._stateObserver = ApplicationState.get().addStateObserver(state => {
      if (!this.isMounted()) {
        return;
      }

      if (state === ApplicationState.Unlocking) {
        this.unlockContent();
      }

      if (state === ApplicationState.Locking) {
        this.lockContent();
      }
    });
  }

  shouldComponentUpdate(nextProps, nextState) {
    let isSame =
      Abstract.IsDeepEqual(nextProps, this.props, null, ['navigation']) &&
      Abstract.IsDeepEqual(nextState, this.state);
    return !isSame;
  }

  onThemeChange() {
    super.onThemeChange();
    try {
      // Navigator doesnt really use activeTheme. We pass it here just as a way to trigger
      // navigationOptions to reload.
      this.props.navigation.setParams({
        activeTheme: StyleKit.get().activeTheme,
      });
    } catch {}
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    this.willUnmount = true;
    this.mounted = false;
    for (const listener of this.listeners) {
      listener.remove();
    }
    ApplicationState.get().removeStateObserver(this._stateObserver);
    this.componentDidBlur(); // This is not called automatically when the component unmounts. https://github.com/react-navigation/react-navigation/issues/4003
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);

    if (ApplicationState.get().isUnlocked() && !this.loadedInitialState) {
      this.loadInitialState();
    }

    if (this._renderOnMount) {
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
    this.willBeVisible = true;

    if (ApplicationState.get().isUnlocked() && this.state.lockContent) {
      this.unlockContent();
    }
  }

  componentDidFocus() {
    this.visible = true;
    this.configureNavBar(false);
  }

  componentWillBlur() {
    this.willBeVisible = false;
  }

  componentDidBlur() {
    this.visible = false;
  }

  getProp = prop => {
    // this.props.navigation could be undefined if we're in the drawer
    return (
      this.props.navigation.getParam && this.props.navigation.getParam(prop)
    );
  };

  setTitle(title) {
    let options = {};
    options.title = title;
    this.props.navigation.setParams(options);
  }

  setSubTitle(subtitle, color) {
    let options = {};
    options.subtitle = subtitle;
    options.subtitleColor = color;
    this.props.navigation.setParams(options);
  }

  lockContent() {
    this.mergeState({ lockContent: true });
    this.configureNavBar();
  }

  unlockContent(callback) {
    if (!this.loadedInitialState) {
      this.loadInitialState();
    }
    this.setState({ lockContent: false }, () => {
      callback && callback();
    });
  }

  constructState(state) {
    this.state = _.merge(
      { lockContent: ApplicationState.get().isLocked() },
      state
    );
  }

  mergeState(state) {
    /*
      We're getting rid of the original implementation of this, which was to pass a function into set state.
      The reason was, when compared new and previous values in componentShouldUpdate, if we used the function approach,
      it would always have the new values for both. Doing a normal setState({}) did not have this issue,
    */
    // this.setState((prevState) => {
    //   return _.merge(prevState, state);
    // })

    this.setState(state);
  }

  renderOnMount(callback) {
    if (this.isMounted()) {
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

  configureNavBar(initial) {}

  popToRoot() {
    this.props.navigation.popToTop();
  }

  dismiss() {
    /*
      the `null` parameter is actually very important: https://reactnavigation.org/docs/en/navigation-prop.html#goback-close-the-active-screen-and-move-back
    */
    this.props.navigation.goBack(null);
  }

  async handlePrivilegedAction(isProtected, action, run, onCancel) {
    if (isProtected) {
      const actionRequiresPrivs = await PrivilegesManager.get().actionRequiresPrivilege(
        action
      );
      if (actionRequiresPrivs) {
        PrivilegesManager.get().presentPrivilegesModal(
          action,
          this.props.navigation,
          () => {
            run();
          },
          onCancel
        );
      } else {
        run();
      }
    } else {
      run();
    }
  }

  static IsShallowEqual = (newObj, prevObj, keys) => {
    if (!keys) {
      keys = Object.keys(newObj);
    }
    for (var key of keys) {
      if (newObj[key] !== prevObj[key]) {
        return false;
      }
    }
    return true;
  };

  static IsDeepEqual = (newObj, prevObj, keys, omitKeys = []) => {
    if (!keys) {
      keys = Object.keys(newObj);
    }
    for (var omitKey of omitKeys) {
      _.pull(keys, omitKey);
    }
    return _.isEqual(_.pick(newObj, keys), _.pick(prevObj, keys));
  };
}
