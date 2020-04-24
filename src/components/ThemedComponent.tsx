import { Component } from 'react';
import StyleKit from '@Style/StyleKit';

export default class ThemedComponent extends Component {
  constructor(props) {
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
