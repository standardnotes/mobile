package com.standardnotes.sntextview;

import android.support.annotation.Nullable;

import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

import java.util.Map;

import static java.security.AccessController.getContext;

/**
 * Created by mo on 9/20/17.
 */

public class SNTextViewManager extends SimpleViewManager<SNTextView> {

    public static final String REACT_CLASS = "SNTextView";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    public SNTextView createViewInstance(ThemedReactContext context) {
        return new SNTextView(context);
    }

    @ReactProp(name = "text")
    public void setText(SNTextView view, String text) {
        view.setText(text);
    }


    @Override
    public @Nullable Map getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.of(
                "onChangeTextValue",
                MapBuilder.of("registrationName", "onChangeTextValue")
        );
    }
}
