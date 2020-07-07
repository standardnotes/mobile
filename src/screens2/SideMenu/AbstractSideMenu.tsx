import Abstract, {
  AbstractProps,
  AbstractState,
} from '@Root/screens2/Abstract';
import { Keyboard } from 'react-native';

export default class AbstractSideMenu<
  AdditionalProps extends AbstractProps,
  AdditionalState extends AbstractState
> extends Abstract<AdditionalProps, AdditionalState> {
  handler: any;
  shouldComponentUpdate(nextProps: Readonly<AbstractProps & AdditionalProps>) {
    /*
      We had some performance issues with this component rendering too many times when
      navigating to unrelated routes, like pushing Compose. It would render 6 times or so,
      causing slowdown. We only want to render if there's a difference in drawer related properties.
    */

    const isDrawerOpen = this.props.navigation.state.isDrawerOpen;
    const isDrawerGoingToBeOpen = nextProps.navigation.state.isDrawerOpen;

    // When the drawer is opening, we want to be sure to dismiss the keyboard if it's up
    if (!isDrawerOpen && isDrawerGoingToBeOpen) {
      this.psuedo_willFocus();
    }

    // We only need this to render when the drawer is opening, not when closing.
    return !isDrawerOpen && isDrawerGoingToBeOpen;
  }

  psuedo_willFocus() {
    // componentWillFocus is not called for drawer components when they are about to appear
    // instead, we piggyback on the logic in shouldComponentUpdate above to determine
    // if navigation state is about to change, and if so, we call this.
    Keyboard.dismiss();

    this.handler &&
      this.handler.onKeyboardDismiss &&
      this.handler.onKeyboardDismiss();
  }
}
