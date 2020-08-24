package com.standardnotes;

import android.os.Bundle;

import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.ReactRootView;
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView;

public class MainActivity extends ReactActivity {

     @Override
    protected void onCreate(Bundle savedInstance) {
         super.onCreate(null);
    }

    public static class SNReactActivityDelegate extends ReactActivityDelegate {
        public SNReactActivityDelegate(ReactActivity activity, String mainComponentName) {
            super(activity, mainComponentName);
        }


        @Override
        protected Bundle getLaunchOptions() {
            String packageName = this.getContext().getPackageName();
            Bundle props = new Bundle();
            if (packageName.equals("com.standardnotes.dev")) {
                props.putString("env", "dev");
            } else {
                props.putString("env", "prod");
            }
            return props;
        }
    }

    @Override
    protected String getMainComponentName() {
      return "StandardNotes";
    }

    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new SNReactActivityDelegate(this, getMainComponentName()) {
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
