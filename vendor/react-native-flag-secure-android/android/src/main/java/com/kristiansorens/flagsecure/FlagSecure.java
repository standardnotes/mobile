// Adapted from
// https://github.com/corbt/react-native-keep-awake

package com.kristiansorens.flagsecure;

import android.app.Activity;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class FlagSecure extends ReactContextBaseJavaModule {

    public static FlagSecure instance;

    public FlagSecure(ReactApplicationContext reactContext) {
        super(reactContext);
        instance = this;
    }

    public boolean enabled = false;

    @Override
    public String getName() {
        return "FlagSecure";
    }

    @ReactMethod
    public void activate() {
        enabled = true;

        final Activity activity = getCurrentActivity();

        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    // See https://stackoverflow.com/a/11121897/458960
                    if(android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.HONEYCOMB) {
                        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                }
            });
        }
    }

    @ReactMethod
    public void deactivate() {
        enabled = false;

        final Activity activity = getCurrentActivity();

        if (activity != null) {
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }
    }
}
