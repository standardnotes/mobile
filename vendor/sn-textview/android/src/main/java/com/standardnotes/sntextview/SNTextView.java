package com.standardnotes.sntextview;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.text.Editable;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;

import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import static java.security.AccessController.getContext;

/**
 * Created by mo on 9/20/17.
 */

public class SNTextView extends LinearLayout {

    private EditText editText;
    private ScrollView scrollView;

    @SuppressLint("ResourceAsColor")
    public SNTextView(Context context) {
        super(context);

        LayoutParams lp = new LayoutParams(MATCH_PARENT, MATCH_PARENT);

        scrollView = new ScrollView(context);
        scrollView.setBackgroundColor(android.R.color.transparent);
        scrollView.setLayoutParams(lp);

        editText = new EditText(this.getContext());
        editText.setLayoutParams(lp);

        editText.addTextChangedListener(new TextWatcher() {

            @Override
            public void afterTextChanged(Editable s) {

            }

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                textDidChange(s.toString());
            }
        });

        scrollView.addView(editText);
        this.addView(scrollView, lp);
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }


    public void setText(String text) {
        editText.setText(text);
    }

    public void textDidChange(String text) {
        WritableMap event = Arguments.createMap();
        event.putString("message", editText.getText().toString());

        final Context context = getContext();
        if (context instanceof ReactContext) {
            ((ReactContext) context).getJSModule(RCTEventEmitter.class).receiveEvent(getId(),"onChangeTextValue", event);
        }
    }
}
