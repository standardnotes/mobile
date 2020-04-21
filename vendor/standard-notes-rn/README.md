# standard-notes-rn

## Setup

```bash
npm install standard-notes-rn --save
react-native link standard-notes-rn
```

#### iOS
* Add SNReactNative.xcoderproj into your project in the Libraries folder.
* Add the .a file on the General tab of your target under Linked Frameworks And Libraries
* Add the .a file on the Build Phases tab of your target under Link Binary With Libraries

#### Android
* In the settings.gradle
  ```
    include ':standard-notes-rn', ':app'
    project(':standard-notes-rn').projectDir = new File(rootProject.projectDir, '../node_modules/standard-notes-rn/android')
  ```
* In the build.gradle
  ```
    compile project(':standard-notes-rn')
  ```
* In MainApplication.java
  ```
    import org.standardnotes.SNReactNative.SNReactNativePackage;
    ...
    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
        ...
        new SNReactNativePackage(),
        ...
      );
    }
    ...
  ```
## Usage

```javascript
import SNReactNative from 'standard-notes-rn';
...
SNReactNative.exitApp();
...
```
