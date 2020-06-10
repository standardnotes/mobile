import React, { useContext } from 'react';
import HeaderButtons, {
  HeaderButton,
  HeaderButtonProps,
} from 'react-navigation-header-buttons';
import _ from 'lodash';
import Icon from 'react-native-vector-icons/Ionicons';
import { HeaderTitleView } from '@Components/HeaderTitleView';
import ThemedComponent from '@Root/components2/ThemedComponent';
import { ApplicationContext } from '@Root/ApplicationContext';
import { AppStateType } from '@Lib/ApplicationState';

const IoniconsHeaderButton = (passMeFurther: HeaderButtonProps) => {
  // the `passMeFurther` variable here contains props from <Item .../> as well as <HeaderButtons ... />
  // and it is important to pass those props to `HeaderButton`
  // then you may add some information like icon size or color (if you use icons)
  const application = useContext(ApplicationContext);
  return (
    <HeaderButton
      {...passMeFurther}
      IconComponent={Icon}
      iconSize={30}
      color={application?.getThemeService().variables.stylekitInfoColor}
    />
  );
};

export type AbstractProps = {
  navigation: any;
};

export type AbstractState = {
  lockContent?: boolean;
};

export default class Abstract<
  TProps extends AbstractProps = AbstractProps,
  TState extends AbstractState = AbstractState
> extends ThemedComponent<TProps, TState> {
  static contextType = ApplicationContext;
  static getDefaultNavigationOptions = ({
    navigation,
    _navigationOptions,
    templateOptions,
  }: {
    navigation: {
      getParam: (arg0: string) => string | undefined;
    };
    _navigationOptions: any;
    templateOptions?: {
      title?: any;
      subtitle?: any;
      leftButton?: any;
      rightButton?: any;
    };
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
      // TODO: fix colors for navigation in static method or move to new navigation
      headerStyle: {
        backgroundColor: '#F6F6F6', // stylekitContrastBackgroundColor
        borderBottomColor: '#e3e3e3', // stylekitContrastBorderColor
        borderBottomWidth: 1,
      },
      headerTintColor: '#086DD6', // stylekitInfoColor
    };

    let headerLeft, headerRight;
    let leftButton =
      navigation.getParam('leftButton') || templateOptions.leftButton;
    if (leftButton) {
      headerLeft = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <HeaderButtons.Item
            testID="headerButton"
            disabled={leftButton.disabled}
            title={leftButton.title}
            iconName={leftButton.iconName}
            onPress={leftButton.onPress}
          />
        </HeaderButtons>
      );

      // @ts-ignore setting a property on navigation object
      options.headerLeft = headerLeft;
    }

    let rightButton =
      navigation.getParam('rightButton') || templateOptions.rightButton;
    if (rightButton) {
      headerRight = (
        <HeaderButtons HeaderButtonComponent={IoniconsHeaderButton}>
          <HeaderButtons.Item
            disabled={rightButton.disabled}
            title={rightButton.title}
            iconName={rightButton.iconName}
            onPress={rightButton.onPress}
          />
        </HeaderButtons>
      );

      // @ts-ignore setting a property on navigation object
      options.headerRight = headerRight;
    }

    return options;
  };

  static navigationOptions = (navigationProps: {
    navigation: any;
    navigationOptions: any;
  }) => {
    return Abstract.getDefaultNavigationOptions({
      navigation: navigationProps.navigation,
      _navigationOptions: navigationProps.navigationOptions,
    });
  };
  listeners: any[];
  removeStateObserver: () => void;
  willUnmount: boolean = false;
  mounted: boolean = false;
  loadedInitialState: boolean = false;
  _renderOnMount?: boolean;
  _renderOnMountCallback: (() => void) | null = null;
  willBeVisible: boolean = false;
  visible: boolean = false;

  constructor(props: Readonly<TProps>) {
    super(props);

    this.state = { lockContent: true } as TState;

    this.listeners = [
      this.props.navigation.addListener('willFocus', () => {
        this.componentWillFocus();
      }),
      this.props.navigation.addListener('didFocus', () => {
        this.componentDidFocus();
      }),
      this.props.navigation.addListener('willBlur', () => {
        this.componentWillBlur();
      }),
      this.props.navigation.addListener('didBlur', () => {
        this.componentDidBlur();
      }),
    ];

    this.removeStateObserver = this.context!.getAppState().addStateChangeObserver(
      state => {
        if (!this.isMounted()) {
          return;
        }

        if (state === AppStateType.Unlocking) {
          this.unlockContent();
        }

        if (state === AppStateType.Locking) {
          this.lockContent();
        }
      }
    );
  }

  shouldComponentUpdate(nextProps: TProps, nextState: TState) {
    let isSame =
      Abstract.IsDeepEqual(nextProps, this.props, [], ['navigation']) &&
      Abstract.IsDeepEqual(nextState, this.state);
    return !isSame;
  }

  onThemeChange() {
    super.onThemeChange();
    try {
      // Navigator doesnt really use activeTheme. We pass it here just as a way to trigger
      // navigationOptions to reload.
      this.props.navigation.setParams({
        activeTheme: this.context?.getThemeService().activeTheme,
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
    this.removeStateObserver();
    this.componentDidBlur(); // This is not called automatically when the component unmounts. https://github.com/react-navigation/react-navigation/issues/4003
  }

  componentDidMount() {
    this.mounted = true;
    this.configureNavBar(true);

    if (this.context?.isLocked() && !this.loadedInitialState) {
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

    if (this.context?.isLocked() && this.state.lockContent) {
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

  getProp = (prop: any) => {
    // this.props.navigation could be undefined if we're in the drawer
    return (
      this.props.navigation.getParam && this.props.navigation.getParam(prop)
    );
  };

  setTitle(title: string) {
    let options: { title?: string } = {};
    options.title = title;
    this.props.navigation.setParams(options);
  }

  setSubTitle(subtitle: string | null, color?: string) {
    let options: { subtitle?: string | null; subtitleColor?: string } = {};
    options.subtitle = subtitle;
    options.subtitleColor = color;
    this.props.navigation.setParams(options);
  }

  lockContent() {
    this.mergeState({ lockContent: true });
    this.configureNavBar(false);
  }

  unlockContent(callback?: { (): void }) {
    if (!this.loadedInitialState) {
      this.loadInitialState();
    }
    this.setState({ lockContent: false }, () => {
      callback && callback();
    });
  }

  constructState(state: { title?: any; noteLocked?: boolean; text?: any }) {
    this.state = _.merge(
      { lockContent: this.context?.isLocked() },
      state
    ) as TState;
  }

  mergeState(
    state:
      | {}
      | ((
          prevState: Readonly<TState>,
          props: Readonly<TProps>
        ) => {} | Pick<{}, never> | null)
      | null
  ) {
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

  renderOnMount(callback: () => any) {
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

  configureNavBar(_initial: boolean) {}

  popToRoot() {
    this.props.navigation.popToTop();
  }

  dismiss() {
    /*
      the `null` parameter is actually very important: https://reactnavigation.org/docs/en/navigation-prop.html#goback-close-the-active-screen-and-move-back
    */
    this.props.navigation.goBack(null);
  }

  static IsShallowEqual = (
    newObj: { [x: string]: any },
    prevObj: { [x: string]: any },
    keys: string[]
  ) => {
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

  static IsDeepEqual = (
    newObj: {},
    prevObj: any,
    keys?: string[],
    omitKeys: string[] = []
  ) => {
    if (!keys) {
      keys = Object.keys(newObj);
    }
    for (var omitKey of omitKeys) {
      _.pull(keys, omitKey);
    }
    return _.isEqual(_.pick(newObj, keys), _.pick(prevObj, keys));
  };
}
