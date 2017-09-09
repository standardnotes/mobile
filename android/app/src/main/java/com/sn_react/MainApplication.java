package com.sn_react;

import android.app.Application;

//import com.facebook.react.ReactApplication;
import com.reactnativenavigation.NavigationReactPackage;
import com.oblador.keychain.KeychainPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.tectiv3.aes.RCTAesPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;

import android.support.annotation.Nullable;

import java.util.Arrays;
import java.util.List;

import com.reactnativenavigation.NavigationApplication;

public class MainApplication extends NavigationApplication {

  @Override
  public boolean isDebug() {
    // Make sure you are using BuildConfig from your own application
    return BuildConfig.DEBUG;
  }


    protected List<ReactPackage> getPackages() {
      return Arrays.asList(
            new MainReactPackage(),
            new NavigationReactPackage(),
            new KeychainPackage(),
            new VectorIconsPackage(),
            new RCTAesPackage()
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
    SoLoader.init(this, /* native exopackage */ false);
  }
}
