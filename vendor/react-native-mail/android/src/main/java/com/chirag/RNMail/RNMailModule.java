package com.chirag.RNMail;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.text.Html;
import android.util.Base64;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.Html;
import android.text.Spanned;
import android.util.Base64;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.Callback;

import java.io.FileWriter;
import java.io.BufferedWriter;
import java.io.FileOutputStream;

import java.io.IOException;
import java.util.List;
import java.io.File;

/**
 * NativeModule that allows JS to open emails sending apps chooser.
 */
public class RNMailModule extends ReactContextBaseJavaModule {

  ReactApplicationContext reactContext;

  public RNMailModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "RNMail";
  }

  /**
    * Converts a ReadableArray to a String array
    *
    * @param r the ReadableArray instance to convert
    *
    * @return array of strings
  */
  private String[] readableArrayToStringArray(ReadableArray r) {
    int length = r.size();
    String[] strArray = new String[length];

    for (int keyIndex = 0; keyIndex < length; keyIndex++) {
      strArray[keyIndex] = r.getString(keyIndex);
    }

    return strArray;
  }

  private byte[] getBlob(ReadableMap map, String key) {
    if (map.hasKey(key) && map.getType(key) == ReadableType.String) {
      String base64 = map.getString(key);
      if (base64 != null && !base64.isEmpty()) {
        return Base64.decode(base64, 0);
      }
    }
    return null;
  }

  private File createTempFile(String filename, String ext) {
    if (filename != null && ext != null) {
      try {
        return File.createTempFile(filename, ext, reactContext.getExternalCacheDir());
      } catch (IOException e1) {
      }
    }
    return null;
  }

  @ReactMethod
  public void mail(ReadableMap options, Callback callback) {
    Intent i = new Intent(Intent.ACTION_SENDTO);
    i.setData(Uri.parse("mailto:"));

    if (options.hasKey("subject") && !options.isNull("subject")) {
      i.putExtra(Intent.EXTRA_SUBJECT, options.getString("subject"));
    }

    if (options.hasKey("body") && !options.isNull("body")) {
      String body = options.getString("body");
      if (options.hasKey("isHTML") && options.getBoolean("isHTML")) {
        i.putExtra(Intent.EXTRA_TEXT, Html.fromHtml(body));
      } else {
        i.putExtra(Intent.EXTRA_TEXT, body);
      }
    }

    if (options.hasKey("recipients") && !options.isNull("recipients")) {
      ReadableArray recipients = options.getArray("recipients");
      i.putExtra(Intent.EXTRA_EMAIL, readableArrayToStringArray(recipients));
    }

    if (options.hasKey("ccRecipients") && !options.isNull("ccRecipients")) {
      ReadableArray ccRecipients = options.getArray("ccRecipients");
      i.putExtra(Intent.EXTRA_CC, readableArrayToStringArray(ccRecipients));
    }

    if (options.hasKey("bccRecipients") && !options.isNull("bccRecipients")) {
      ReadableArray bccRecipients = options.getArray("bccRecipients");
      i.putExtra(Intent.EXTRA_BCC, readableArrayToStringArray(bccRecipients));
    }

    if (options.hasKey("attachment") && !options.isNull("attachment")) {
      ReadableMap attachment = options.getMap("attachment");
      File file;
      if(attachment.hasKey("data") && !attachment.isNull("data")) {
        byte[] blob = getBlob(attachment, "data");
        file = createTempFile(attachment.getString("name"), attachment.getString("type"));
        if (blob != null) {
          file = writeBlob(file, blob);
        }
      } else {
        String path = attachment.getString("path");
        file = new File(path);
      }
      Uri p = Uri.fromFile(file);
      i.putExtra(Intent.EXTRA_STREAM, p);
    }

    PackageManager manager = reactContext.getPackageManager();
    List<ResolveInfo> list = manager.queryIntentActivities(i, 0);

    if (list == null || list.size() == 0) {
      callback.invoke("not_available");
      return;
    }

    if (list.size() == 1) {
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      try {
        reactContext.startActivity(i);
      } catch (Exception ex) {
        callback.invoke("error");
      }
    } else {
      Intent chooser = Intent.createChooser(i, "Send Mail");
      chooser.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

      try {
        reactContext.startActivity(chooser);
      } catch (Exception ex) {
        callback.invoke("error");
      }
    }
  }

  private File writeBlob(File file, byte[] blob) {
    if (file != null && blob != null) {
      FileOutputStream fo = null;
      try {
        fo = new FileOutputStream(file);
        fo.write(blob);
        fo.flush();
        fo.close();
        return file;
      } catch (Exception e) {
        if (fo != null) {
          try {
            fo.close();
          } catch (Exception e1) {
          }
        }
      }
    }
    return null;
  }
}
