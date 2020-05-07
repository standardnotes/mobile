import { PureComponent } from 'react';
import StyleKit from '@Style/StyleKit';

export default class ThemedPureComponent<P = {}, S = {}> extends PureComponent<
  P,
  S
> {
  themeChangeObserver: () => void;
  constructor(props: Readonly<P>) {
    super(props);

    this.loadStyles();
    this.updateStyles();

    this.themeChangeObserver = StyleKit.get().addThemeChangeObserver(() => {
      this.onThemeChange();
      this.forceUpdate();
    });
  }

  componentWillUnmount() {
    StyleKit.get().removeThemeChangeObserver(this.themeChangeObserver);
  }

  onThemeChange() {
    this.loadStyles();
    this.updateStyles();
  }

  loadStyles() {}

  updateStyles() {}
}
