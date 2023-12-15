package com.passportreader;

import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import java.util.Map;
import java.util.HashMap;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognizer;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.Arguments;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import androidx.annotation.NonNull;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;
import android.net.Uri;
import com.facebook.react.bridge.Promise;
import java.io.IOException;

import android.util.Log;

public class TextRecognitionModule extends ReactContextBaseJavaModule {
   TextRecognitionModule(ReactApplicationContext context) {
       super(context);
   }

   // add to TextRecognitionModule.java
    @Override
    public String getName() {
        return "TextRecognitionModule";
    }

    @ReactMethod
    public void recognizeImage(String url, Promise promise) {
        Uri uri = Uri.parse(url);
        InputImage image;
        try {
            image = InputImage.fromFilePath(getReactApplicationContext(), uri);
            // When using Latin script library
            TextRecognizer recognizer =
                    TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

            recognizer.process(image)
                    .addOnSuccessListener(new OnSuccessListener<Text>() {
                        @Override
                        public void onSuccess(Text result) {
                            WritableMap response = Arguments.createMap();
                            WritableArray blocks = Arguments.createArray();

                            for (Text.TextBlock block : result.getTextBlocks()) {
                                WritableMap blockObject = Arguments.createMap();
                                blockObject.putString("text", block.getText());
                                blocks.pushMap(blockObject);
                            }
                            
                            response.putArray("blocks", blocks);
                            promise.resolve(response);
                        }
                    })
                    .addOnFailureListener(
                            new OnFailureListener() {
                                @Override
                                public void onFailure(@NonNull Exception e) {
                                    promise.reject("Create Event Error", e);
                                }
                            });

        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}