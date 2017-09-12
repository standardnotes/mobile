package com.sn_react;

import android.support.annotation.Nullable;

import com.chirag.RNMail.RNMail;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.oblador.keychain.KeychainPackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.reactnativenavigation.NavigationApplication;
import com.tectiv3.aes.RCTAesPackage;

import java.util.Arrays;
import java.util.List;

//import com.facebook.react.ReactApplication;

public class MainApplication extends NavigationApplication {

  @Override
  public boolean isDebug() {
    // Make sure you are using BuildConfig from your own application
    return BuildConfig.DEBUG;
  }


    protected List<ReactPackage> getPackages() {
      return Arrays.asList(
//            new MainReactPackage(),
            new KeychainPackage(),
            new VectorIconsPackage(),
            new RCTAesPackage(),
            new RNMail()
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
