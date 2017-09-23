package com.standardnotes.sntextview;

import android.graphics.Color;
import android.support.annotation.Nullable;

import com.facebook.drawee.backends.pipeline.Fresco;
import com.facebook.react.ReactPackage;
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.common.MapBuilder;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.ViewProps;
import com.facebook.react.uimanager.annotations.ReactProp;
import com.facebook.react.uimanager.annotations.ReactPropGroup;
import com.facebook.react.views.text.DefaultStyleValuesUtil;

import java.util.Map;

import static java.security.AccessController.getContext;

/**
 * Created by mo on 9/20/17.
 */

public class SNTextViewManager extends SimpleViewManager<SNTextView> {

    private static final int[] PADDING_TYPES = {
            Spacing.ALL, Spacing.LEFT, Spacing.RIGHT, Spacing.TOP, Spacing.BOTTOM,
    };

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

    @ReactProp(name = ViewProps.COLOR, customType = "Color")
    public void setColor(SNTextView view, @Nullable Integer color) {
        if (color != null) {
            view.setTextColor(color);
        }
    }

    @ReactProp(name = "selectionColor", customType = "Color")
    public void setSelectionColor(SNTextView view, @Nullable Integer color) {
        if (color != null) {
            view.setHighlightColor(color);
        }
    }

    @ReactPropGroup(names = {
            "padding", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom"
    }, customType = "String")
    public void setBorderColor(SNTextView view, int index, Integer padding) {
        view.setContentPadding(PADDING_TYPES[index], padding);
    }

    @ReactProp(name = "autoFocus")
    public void setAutoFocus(SNTextView view, boolean autoFocus) {
        view.setAutoFocus(autoFocus);
    }


    @Override
    public @Nullable Map getExportedCustomDirectEventTypeConstants() {
        return MapBuilder.of(
                "onChangeTextValue",
                MapBuilder.of("registrationName", "onChangeTextValue")
        );
    }

}
