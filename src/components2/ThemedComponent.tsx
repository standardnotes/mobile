import React, { Component } from 'react';
import { ApplicationContext } from '@Root/ApplicationContext';

export default class ThemedComponent<P = {}, S = any> extends Component<P, S> {
  static contextType = ApplicationContext;
  context!: React.ContextType<typeof ApplicationContext>;
  removeThemeChangeObserver: () => void;
  constructor(props: Readonly<P>) {
    super(props);
    console.log(this.context);
    this.loadStyles();
    this.updateStyles();

    // this.removeThemeChangeObserver = this.context!.getThemeService().addThemeChangeObserver(
    //   () => {
    //     this.onThemeChange();
    //     this.forceUpdate();
    //   }
    // );
  }

  componentWillUnmount() {
    this.removeThemeChangeObserver();
  }

  onThemeChange() {
    this.loadStyles();
    this.updateStyles();
  }

  loadStyles() {}

  updateStyles() {}
}
