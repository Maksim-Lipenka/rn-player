# rn-player
A cross-platform video player with customizable controls for React Native.

![](preview.gif)

## Installation
`yarn add @randomdotcom/rn-player` or `npm i --save @randomdotcom/rn-player`

If you use the bare React Native, you should install the [react-native-unimodules](https://github.com/unimodules/react-native-unimodules) library. (BUT compatibility with bare react native has not yet been tested)

## Usage
The `<Video />` component that library provides is wrapper around expo-av video component.

Basic usage (without fullscreen ability):
```javascript
<Video
  defaultSource={props.video.defaultSource}
  showControlsOnLoad
  shouldPlay
 />
```
Fullscreen example:

```javascript
  import React, { useEffect, useState } from 'react';
  import { View, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
  import { ScreenOrientation } from 'expo'; // You can replace this library by an alternative one
  import Video from '@randomdotcom/rn-player';
  
  const HomeScreen = props => {
  const [inFullscreen, setInFullscreen] = useState(false);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  useEffect(() => {
    props.getVideo(videoId);
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN);

    const orientationListener = event => {
      setScreenWidth(Dimensions.get('window').width);
      if (event.orientationInfo.orientation === 'LANDSCAPE') setInFullscreen(true);
      else setInFullscreen(false);
    };

    let subscription = ScreenOrientation.addOrientationChangeListener(orientationListener);

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, []);

  const fullscreenOn = async () => {
    setInFullscreen(true);
    ScreenOrientation.lockAsync(ScreenOrientation.Orientation.LANDSCAPE_RIGHT).then(() => {
      setScreenWidth(Dimensions.get('window').width);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN);
    });
  };

  const fullscreenOff = async () => {
    setInFullscreen(false);
    ScreenOrientation.lockAsync(ScreenOrientation.Orientation.PORTRAIT_UP).then(() => {
      setScreenWidth(Dimensions.get('window').width);
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL_BUT_UPSIDE_DOWN);
    });
  };

  return props.video ? (
    <View style={{ height: '100%', backgroundColor: '#000' }}>
      <Video
        defaultSource={props.video.defaultSource}
        sources={props.video.sources}
        preview={props.video.preview}
        id={props.video.id}
        title={props.video.title}
        showControlsOnLoad
        width={screenWidth}
        inFullscreen={inFullscreen}
        onFullscreenOn={fullscreenOn}
        onFullscreenOff={fullscreenOff}
        shouldPlay
      />
    </View>
  ) : (
    <ActivityIndicator />
  );
};
```
 
video props from example
```javascript
  {
  defaultSource: "https://59vod-adaptive.akamaized.net/exp=1580153415~acl=%2F226958858%2F%2A~hmac=1a1b393af9ce48f4a67447ac82f8090302bfd88f83d8db3d35a0de27229beb52/226958858/video/1309466738,798109508,798109507,798109503,798109502,798109500,798109498/master.m3u8",
  id: 226958858,
  preview: "https://i.vimeocdn.com/video/824127146_1280.jpg",
  sources: [
    {
      cdn: "akamai_interconnect",
      fps: 29,
      height: 1080,
      id: 798109503,
      mime: "video/mp4",
      origin: "gcs",
      profile: 175,
      quality: "1080p",
      url: "https://vod-progressive.akamaized.net/exp=1580153415~acl=%2A%2F798109503.mp4%2A~hmac=32ef482a50babdb19aad1493c10b2a14226859155eb8fddca8a44d5ab68922ed/vimeo-prod-skyfire-std-us/01/391/9/226958858/798109503.mp4",
      width: 1920,
    },
    {
      cdn: "akamai_interconnect",
      fps: 29,
      height: 720,
      id: 798109498,
      mime: "video/mp4",
      origin: "gcs",
      profile: 174,
      quality: "720p",
      url: "https://vod-progressive.akamaized.net/exp=1580153415~acl=%2A%2F798109498.mp4%2A~hmac=41ac793c71bb5ef15c4a2786d2e1fc8e3a09de8257a6b09ec6736fe48273d438/vimeo-prod-skyfire-std-us/01/391/9/226958858/798109498.mp4",
      width: 1280,
    },
  ],
  title: "Pursuit (4K)",
  url: "https://vimeo.com/226958858",
}
```
