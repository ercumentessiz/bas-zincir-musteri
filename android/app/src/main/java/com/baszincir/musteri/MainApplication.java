package com.baszincir.musteri;

import android.app.Application;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactHost;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.defaults.DefaultReactHost;
import com.facebook.react.defaults.DefaultReactNativeHost;
import com.facebook.react.shell.MainReactPackage;
import java.util.ArrayList;
import java.util.List;

import io.invertase.notifee.NotifeePackage;
import io.invertase.firebase.app.ReactNativeFirebaseAppPackage;
import io.invertase.firebase.auth.ReactNativeFirebaseAuthPackage;
import io.invertase.firebase.firestore.ReactNativeFirebaseFirestorePackage;
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingPackage;
import io.invertase.firebase.storage.ReactNativeFirebaseStoragePackage;
import com.reactnativecommunity.picker.RNCPickerPackage;
import com.rnfs.RNFSPackage;
import com.reactcommunity.rndatetimepicker.RNDateTimePickerPackage;
import com.swmansion.gesturehandler.RNGestureHandlerPackage;
import com.imagepicker.ImagePickerPackage;
import com.th3rdwave.safeareacontext.SafeAreaContextPackage;
import com.swmansion.rnscreens.RNScreensPackage;
import com.oblador.vectoricons.VectorIconsPackage;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost =
      new DefaultReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          List<ReactPackage> packages = new ArrayList<>();
          packages.add(new MainReactPackage());
          packages.add(new NotifeePackage());
          packages.add(new ReactNativeFirebaseAppPackage());
          packages.add(new ReactNativeFirebaseAuthPackage());
          packages.add(new ReactNativeFirebaseFirestorePackage());
          packages.add(new ReactNativeFirebaseMessagingPackage());
          packages.add(new ReactNativeFirebaseStoragePackage());
          packages.add(new RNCPickerPackage());
          packages.add(new RNFSPackage());
          packages.add(new RNDateTimePickerPackage());
          packages.add(new RNGestureHandlerPackage());
          packages.add(new ImagePickerPackage());
          packages.add(new SafeAreaContextPackage());
          packages.add(new RNScreensPackage());
          packages.add(new VectorIconsPackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }

        @Override
        protected boolean isNewArchEnabled() {
          return BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        }

        @Override
        protected Boolean isHermesEnabled() {
          return BuildConfig.IS_HERMES_ENABLED;
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public ReactHost getReactHost() {
    return DefaultReactHost.getDefaultReactHost(getApplicationContext(), getReactNativeHost());
  }

  @Override
  public void onCreate() {
    super.onCreate();
  }
}
