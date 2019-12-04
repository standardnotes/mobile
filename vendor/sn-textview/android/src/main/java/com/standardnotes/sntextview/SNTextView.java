package com.standardnotes.sntextview;

import android.app.Activity;
import android.content.Context;
import android.graphics.PorterDuff;
import android.graphics.drawable.Drawable;
import androidx.core.content.ContextCompat;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.view.Gravity;
import android.view.inputmethod.InputMethodManager;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.uimanager.Spacing;
import com.facebook.react.uimanager.events.RCTEventEmitter;

import java.lang.reflect.Field;

import static android.view.ViewGroup.LayoutParams.MATCH_PARENT;
import static android.view.ViewGroup.LayoutParams.WRAP_CONTENT;

/**
 * Created by mo on 9/20/17.
 */

public class SNTextView extends LinearLayout {

    private SNEditText editText;
    private ScrollView scrollView;
    private Boolean ignoreNextLocalTextChange = false;

    public SNTextView(Context context) {
        super(context);

        scrollView = new ScrollView(context);
        scrollView.setLayoutParams(new LinearLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT));
        scrollView.setClipToPadding(false);
        scrollView.setFillViewport(true);

        editText = new SNEditText(context);
        editText.setLayoutParams(new ScrollView.LayoutParams(MATCH_PARENT, WRAP_CONTENT));
        editText.setGravity(Gravity.TOP);
        editText.setInputType(editText.getInputType() | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_AUTO_CORRECT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);


        // This was used in conjunction with setting raw input type for selecting lock notes.
        // However, it causes the keyboard to not come up for editing existing notes.
        // Tested while offline using brand new installation on Android 6 emulator, but a user with Android 7 also reported it.
        // editText.setTextIsSelectable(true);

        scrollView.addView(editText);
        this.addView(scrollView);

        editText.addTextChangedListener(new TextWatcher() {
            private String mPreviousText;

            @Override
            public void afterTextChanged(Editable s) {

            }

            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
                mPreviousText = s.toString();
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                // Rearranging the text (i.e. changing between singleline and multiline attributes) can
                // also trigger onTextChanged, call the event in JS only when the text actually changed
                if (count == 0 && before == 0) {
                    return;
                }


                String newText = s.toString().substring(start, start + count);
                String oldText = mPreviousText.substring(start, start + before);
                // Don't send same text changes
                if (count == before && newText.equals(oldText)) {
                    return;
                }

                if(ignoreNextLocalTextChange) {
                    ignoreNextLocalTextChange = false;
                    return;
                }

                WritableMap event = Arguments.createMap();
                event.putString("text", s.toString());

                final Context context = getContext();
                if (context instanceof ReactContext) {
                    ((ReactContext) context).getJSModule(RCTEventEmitter.class).receiveEvent(getId(),"onChangeText", event);
                }
            }
        });
    }

    @Override
    protected void onLayout(boolean changed, int left, int top, int right, int bottom) {
        super.onLayout(changed, left, top, right, bottom);
    }

    public void setText(String text) {
        // Fix for issue where first character typed does not trigger save event.
        // setText is called with an empty string originally as soon as the text view is initialized.
        // Thus, ignoreNextLocalTextChange would be set to true, and would ignore the first character typed.
        boolean isEmpty = text == null || text.trim().length() == 0;
        ignoreNextLocalTextChange = !isEmpty;
        editText.setText(text);
    }

    public void setAutoFocus(boolean autoFocus) {
        if(autoFocus) {
            editText.requestFocus();
            InputMethodManager imm = (InputMethodManager) getContext().getSystemService(Context.INPUT_METHOD_SERVICE);
            imm.toggleSoftInput(InputMethodManager.SHOW_FORCED, InputMethodManager.HIDE_IMPLICIT_ONLY);
        }
    }

    public void setEditable(boolean editable) {
        /*
            setRawInputType is the only solution that works for keeping the text selectable while disabled
            previously we used setEnabled(false), but this would make text unselectable when the note is locked.
            setInputType(null) also doesn't work because it removes the multiline functionality.
            With setRawInputType, the keyboard doesn't come up, but if you're using a hardware keyboard,
            changes will still be received. So we combine the below with javascript side lock checking to decline
            any physical changes.

            editText.setTextIsSelectable is also required for this to work, which is set at setup

            Update: setTextIsSelectable causes keyboard to not come up. Go back to setEnabled
            until we can determine a different solution

            Previous solution for selecting locked notes:
            if(!editable) {
              editText.setRawInputType(InputType.TYPE_NULL);
            } else {
            editText.setRawInputType(editText.getInputType() | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | InputType.TYPE_TEXT_FLAG_AUTO_CORRECT | InputType.TYPE_TEXT_FLAG_MULTI_LINE);
            }
         */
        editText.setEnabled(editable);

    }

    public void blur() {
        editText.clearFocus();

        // this does the actual keyboard dismissal
        InputMethodManager imm = (InputMethodManager) this.getContext().getSystemService(Activity.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(editText.getWindowToken(), 0);
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
        } catch (Exception ignored) {}
    }

    public void setHandlesColor(int color) {
        try {

            Field editorField = TextView.class.getDeclaredField("mEditor");
            if (!editorField.isAccessible()) {
                editorField.setAccessible(true);
            }

            Object editor = editorField.get(editText);
            Class<?> editorClass = editor.getClass();

            String[] handleNames = {"mSelectHandleLeft", "mSelectHandleRight", "mSelectHandleCenter"};
            String[] resNames = {"mTextSelectHandleLeftRes", "mTextSelectHandleRightRes", "mTextSelectHandleRes"};

            for (int i = 0; i < handleNames.length; i++) {
                Field handleField = editorClass.getDeclaredField(handleNames[i]);
                if (!handleField.isAccessible()) {
                    handleField.setAccessible(true);
                }

                Drawable handleDrawable = (Drawable) handleField.get(editor);

                if (handleDrawable == null) {
                    Field resField = TextView.class.getDeclaredField(resNames[i]);
                    if (!resField.isAccessible()) {
                        resField.setAccessible(true);
                    }
                    int resId = resField.getInt(editText);
                    handleDrawable = ContextCompat.getDrawable(editText.getContext(), resId);
                }

                if (handleDrawable != null) {
                    Drawable drawable = handleDrawable.mutate();
                    drawable.setColorFilter(color, PorterDuff.Mode.SRC_IN);
                    handleField.set(editor, drawable);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

}
