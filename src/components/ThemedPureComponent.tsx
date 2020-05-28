import { PureComponent } from 'react';
import { ApplicationContext } from 'App';

export default class ThemedPureComponent<P = {}, S = {}> extends PureComponent<
  P,
  S
> {
  static contextType = ApplicationContext;
  declare context: React.ContextType<typeof ApplicationContext>;
  removeThemeChangeObserver: () => void;
  constructor(props: Readonly<P>) {
    super(props);

    this.loadStyles();
    this.updateStyles();

    this.removeThemeChangeObserver = this.context!.getThemeService().addThemeChangeObserver(
      () => {
        this.onThemeChange();
        this.forceUpdate();
      }
    );
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
