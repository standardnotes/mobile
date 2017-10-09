package com.standardnotes.sntextview;

import android.content.Context;
import android.widget.EditText;

public class SNEditText extends EditText {

    public SNEditText(Context context) {
        super(context);
    }

    // After the text changes inside an EditText, TextView checks if a layout() has been requested.
    // If it has, it will not scroll the text to the end of the new text inserted, but wait for the
    // next layout() to be called. However, we do not perform a layout() after a requestLayout(), so
    // we need to override isLayoutRequested to force EditText to scroll to the end of the new text
    // immediately.

    @Override
    public boolean isLayoutRequested() {
        // If we are watching and updating container height based on content size
        // then we don't want to scroll right away. This isn't perfect -- you might
        // want to limit the height the text input can grow to. Possible solution
        // is to add another prop that determines whether we should scroll to end
        // of text.
        return false;
    }
}
