package com.standardnotes;

import com.facebook.react.modules.network.OkHttpClientProvider;

import android.app.Application;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.support.annotation.Nullable;
import android.view.WindowManager;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import com.reactnativecommunity.webview.RNCWebViewPackage;
import com.vinzscam.reactnativefileviewer.RNFileViewerPackage;
import com.rnfs.RNFSPackage;
import com.swmansion.gesturehandler.react.RNGestureHandlerPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.core.DeviceEventManagerModule;
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
import org.standardnotes.SNReactNative.SNReactNativePackage;

import java.lang.reflect.InvocationTargetException;
import java.util.List;


public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      @SuppressWarnings("UnnecessaryLocalVariable")
      List<ReactPackage> packages = new PackageList(this).getPackages();

      // Packages that cannot be autolinked yet can be added manually here, for example:
      // packages.add(new MyReactNativePackage());

      packages.add(new MainReactPackage());
      packages.add(new AsyncStoragePackage());
      packages.add(new RNCWebViewPackage());
      packages.add(new RNFileViewerPackage());
      packages.add(new RNFSPackage());
      packages.add(new RNGestureHandlerPackage());
      packages.add(BugsnagReactNative.getPackage());
      packages.add(new KeychainPackage());
      packages.add(new VectorIconsPackage());
      packages.add(new RCTAesPackage());
      packages.add(new RNMail());
      packages.add(new ReactNativeFingerprintScannerPackage());
      packages.add(new SNTextViewPackage());
      packages.add(new FlagSecurePackage());
      packages.add(new SNReactNativePackage());

      return packages;
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

    rebuildOkHtttp();

    SoLoader.init(this, /* native exopackage */ false);

    initializeFlipper(this); // Remove this line if you don't want Flipper enabled

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

  private void rebuildOkHtttp() {
    OkHttpClientProvider.setOkHttpClientFactory(new CustomClientFactory());
  }

  /**
   * Loads Flipper in React Native templates.
   *
   * @param context
   */
  private static void initializeFlipper(Context context) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.facebook.flipper.ReactNativeFlipper");
        aClass.getMethod("initializeFlipper", Context.class).invoke(null, context);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }
}
