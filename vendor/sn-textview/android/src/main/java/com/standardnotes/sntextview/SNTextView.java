package com.standardnotes.sntextview;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PorterDuff;
import android.graphics.drawable.Drawable;
import android.support.v4.content.ContextCompat;
import android.text.Editable;
import android.text.Layout;
import android.text.TextWatcher;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.InputMethodManager;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.lang.reflect.Field;

import static java.security.AccessController.getContext;

/**
 * Created by mo on 9/20/17.
 */

public class SNTextView extends LinearLayout {

    private EditText editText;
    private ScrollView scrollView;
    private Boolean ignoreNextTextEvent;

    @SuppressLint("ResourceAsColor")
    public SNTextView(Context context) {
        super(context);

        LayoutParams lp = new LayoutParams(MATCH_PARENT, MATCH_PARENT);

        scrollView = new ScrollView(context);
        scrollView.setBackgroundColor(android.R.color.transparent);
        scrollView.setLayoutParams(lp);

        editText = new EditText(this.getContext());
        LayoutParams textLayout = new LayoutParams(MATCH_PARENT, MATCH_PARENT);
        editText.setLayoutParams(textLayout);
        editText.addTextChangedListener(new TextWatcher() {

            @Override
            public void afterTextChanged(Editable s) {

            }

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {

            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if(ignoreNextTextEvent) {
                    ignoreNextTextEvent = false;
                    return;
                }
                textDidChange(s.toString());
            }
        });

        scrollView.addView(editText);
        this.addView(scrollView);
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }


    public void setText(String text) {
        ignoreNextTextEvent = true;
        editText.setText(text);
    }

    public void setAutoFocus(boolean autoFocus) {
        if(autoFocus) {
            editText.requestFocus();
            InputMethodManager imm = (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.toggleSoftInput(InputMethodManager.SHOW_FORCED, InputMethodManager.HIDE_IMPLICIT_ONLY);
        }
    }

    public void setContentPadding(int position, Integer padding) {
        float scale = getResources().getDisplayMetrics().density;
        int pixels = (int) (padding * scale + 0.5f);

        if(position == Spacing.ALL) {
            editText.setPadding(pixels, pixels, pixels, pixels);
        } else if(position == Spacing.LEFT) {
            editText.setPadding(pixels, editText.getTotalPaddingTop(), editText.getPaddingRight(), editText.getPaddingBottom());
        } else if(position == Spacing.TOP) {
            editText.setPadding(editText.getPaddingLeft(), pixels, editText.getPaddingRight(), editText.getPaddingBottom());
        } else if(position == Spacing.RIGHT) {
            editText.setPadding(editText.getPaddingLeft(), editText.getTotalPaddingTop(), pixels, editText.getPaddingBottom());
        } else if(position == Spacing.BOTTOM) {
            editText.setPadding(editText.getPaddingLeft(), editText.getTotalPaddingTop(), editText.getPaddingRight(), pixels);
        }
    }

    public void setTextColor(Integer color) {
        editText.setTextColor(color);
    }

    public void setHighlightColor(Integer color) {
        editText.setHighlightColor(color);

        try {
            // Get the cursor resource id
            Field field = TextView.class.getDeclaredField("mCursorDrawableRes");
            field.setAccessible(true);
            int drawableResId = field.getInt(editText);

            // Get the editor
            field = TextView.class.getDeclaredField("mEditor");
            field.setAccessible(true);
            Object editor = field.get(editText);

            // Get the drawable and set a color filter
            Drawable drawable = ContextCompat.getDrawable(editText.getContext(), drawableResId);
            drawable.setColorFilter(color, PorterDuff.Mode.SRC_IN);
            Drawable[] drawables = {drawable, drawable};

            // Set the drawables
            field = editor.getClass().getDeclaredField("mCursorDrawable");
            field.setAccessible(true);
            field.set(editor, drawables);
        } catch (Exception ignored) {
        }
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
