package com.standardnotes;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

    @Override
    protected String getMainComponentName() {
      return "StandardNotes";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
        @Override
        protected ReactRootView createRootView() {
          return new RNGestureHandlerEnabledRootView(MainActivity.this);
        }
      };
    }

    /*
     On back button press, background app instead of quitting it
     https://github.com/facebook/react-native/issues/13775
     */
    @Override
    public void invokeDefaultOnBackPressed() {
        moveTaskToBack(true);
    }
}
