package com.standardnotes;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.JSApplicationIllegalArgumentException;
import com.facebook.react.bridge.Promise;

import java.util.Map;
import java.util.HashMap;

import android.content.Intent;
import android.app.Activity;
import javax.annotation.Nullable;

public class SNShareModule extends ReactContextBaseJavaModule {
  private ReactContext mReactContext;

  private final ActivityEventListener mActivityEventListener = new BaseActivityEventListener() {
    @Override
    public void onNewIntent(Intent intent) {
      String action = intent.getAction();
      String type = intent.getType();

      if (Intent.ACTION_SEND.equals(action) && type != null) {
        if ("text/plain".equals(type)) {
          String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);

          if (sharedText != null) {
            String url = "sn://compose?text=" + sharedText;
            WritableMap params = Arguments.createMap();

            params.putString("url", url);
            mReactContext
              .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
              .emit("url", params);
          }
        }
      }
    }
  };

  public SNShareModule(ReactApplicationContext reactContext) {
    super(reactContext);
    mReactContext = reactContext;
    mReactContext.addActivityEventListener(mActivityEventListener);
  }

  @Override
  public String getName() {
    return "SNShare";
  }

  @ReactMethod
  public void getSharedText(Promise promise) {
    try {
      Activity currentActivity = getCurrentActivity();
      String sharedText = null;

      if (currentActivity != null) {
        Intent intent = currentActivity.getIntent();
        String action = intent.getAction();
        String type = intent.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
          if ("text/plain".equals(type)) {
            String extraText = intent.getStringExtra(Intent.EXTRA_TEXT);

            if (extraText != null) {
              sharedText = "sn://compose?text=" + extraText;
            }
          }
        }
      }

      promise.resolve(sharedText);
    } catch (Exception e) {
      promise.reject(new JSApplicationIllegalArgumentException("Could not get shared text: " + e.getMessage()));
    }
  }
}