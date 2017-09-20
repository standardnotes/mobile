package com.standardnotes;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.support.annotation.Nullable;
import android.view.WindowManager;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.modules.storage.ReactDatabaseSupplier;

import com.chirag.RNMail.RNMail;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.react.modules.core.PermissionAwareActivity;
import com.facebook.react.uimanager.ViewManager;
import com.facebook.soloader.SoLoader;
import com.oblador.keychain.KeychainPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactnativenavigation.NavigationApplication;
import com.reactnativenavigation.controllers.ActivityCallbacks;
import com.standardnotes.sntextview.SNTextViewPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.hieuvp.fingerprint.ReactNativeFingerprintScannerPackage;

import java.util.Arrays;
import java.util.List;
import com.bugsnag.BugsnagReactNative;

public class MainApplication extends NavigationApplication {

  @Override
  public boolean isDebug() {
    // Make sure you are using BuildConfig from your own application
    return BuildConfig.DEBUG;
  }

  protected  List<ViewManager> createViewManagers(ReactApplicationContext reactContext){
    return Arrays.<ViewManager>asList();
  }


  protected List<ReactPackage> getPackages() {
    return Arrays.asList(
//            new MainReactPackage(),
            BugsnagReactNative.getPackage(),
            new KeychainPackage(),
            new VectorIconsPackage(),
            new RCTAesPackage(),
            new RNMail(),
            new ReactNativeFingerprintScannerPackage(),
            new SNTextViewPackage()
    );
  }

  @Override
  @Nullable
  public List<ReactPackage> createAdditionalReactPackages() {
    return getPackages();
  }

  @Override
  public void onCreate() {
    super.onCreate();

    registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
      @Override
      public void onActivityCreated(Activity activity, Bundle savedInstanceState) {
        activity.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
      }

      @Override
      public void onActivityStarted(Activity activity) {

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

    BugsnagReactNative.start(this);
    SoLoader.init(this, /* native exopackage */ false);

    // Set AsyncStorage size, default is 6mb
    long size = 50L * 1024L * 1024L; // 50 MB
    com.facebook.react.modules.storage.ReactDatabaseSupplier.getInstance(getApplicationContext()).setMaximumSize(size);
  }
}
