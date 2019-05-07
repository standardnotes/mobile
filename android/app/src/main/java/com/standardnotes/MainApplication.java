package com.standardnotes;

import android.app.Application;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.Nullable;
import android.view.WindowManager;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import com.rnfs.RNFSPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import com.chirag.RNMail.RNMail;
import com.kristiansorens.flagsecure.FlagSecure;
import com.oblador.keychain.KeychainPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.standardnotes.sntextview.SNTextViewPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.hieuvp.fingerprint.ReactNativeFingerprintScannerPackage;
import com.kristiansorens.flagsecure.FlagSecurePackage;
import com.bugsnag.BugsnagReactNative;

import java.util.Arrays;
import java.util.List;


public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
              new MainReactPackage(),
            new RNCWebViewPackage(),
            new RNFileViewerPackage(),
            new RNFSPackage(),
            new RNGestureHandlerPackage(),
              BugsnagReactNative.getPackage(),
              new KeychainPackage(),
              new VectorIconsPackage(),
              new RCTAesPackage(),
              new RNMail(),
              new ReactNativeFingerprintScannerPackage(),
              new SNTextViewPackage(),
              new FlagSecurePackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();

    SoLoader.init(this, /* native exopackage */ false);

    // Set AsyncStorage size, default is 6mb
    long size = 50L * 1024L * 1024L; // 50 MB
    com.facebook.react.modules.storage.ReactDatabaseSupplier.getInstance(getApplicationContext()).setMaximumSize(size);

    registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
      @Override
      public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        activity.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
      }


      @Override
      public void onActivityStarted(Activity activity) {
        if(FlagSecure.instance != null && FlagSecure.instance.enabled) {
          activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
        }
      }

      @Override
      public void onActivityResumed(Activity activity) {

      }

      @Override
      public void onActivityPaused(Activity activity) {
      }

      @Override
      public void onActivityStopped(Activity activity) {
      }

      public void onActivitySaveInstanceState(Activity activity, Bundle bundle) {

      }

      @Override
      public void onActivityDestroyed(Activity activity) {
      }

    });

    if(!BuildConfig.DEBUG) {
      BugsnagReactNative.start(this);
    }
  }
}
