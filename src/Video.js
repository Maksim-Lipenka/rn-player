import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
  Slider,
  Animated,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { Video as ExpoVideo, Audio } from 'expo-av';
import { Feather, MaterialCommunityIcons as Material } from '@expo/vector-icons';
import styles from './Video.style';

const defaultMinimizeIcon = <Feather name={'minimize-2'} color="#eee" size={26} />;
const defaultMaximizeIcon = <Feather name={'maximize-2'} color="#eee" size={26} />;
const defaultPauseIcon = <Material name="pause" size={60} color="white" />;
const defaultPlayIcon = <Material name="play" size={60} color="white" />;
const defaultSettingsIcon = isQualitySelectorVisible => (
  <Material
    name="settings"
    size={30}
    color={isQualitySelectorVisible ? '#1f1f1f' : '#f1f1f1'}
    style={styles.iconFixStyle}
  />
);
const defaultActivityIndicator = <ActivityIndicator />;

const ControlStates = {
  Shown: 'Show',
  Showing: 'Showing',
  Hidden: 'Hidden',
  Hiding: 'Hiding',
};

const SeekStates = {
  NotSeeking: 'NotSeeking',
  Seeking: 'Seeking',
  Seeked: 'Seeked',
};

const PlaybackStates = {
  Loading: 'Loading',
  Playing: 'Playing',
  Paused: 'Paused',
  Buffering: 'Buffering',
  Error: 'Error',
  Ended: 'Ended',
};

export default props => {
  const playbackInstance = useRef(null);
  let shouldPlayAtEndOfSeek = false;
  let controlsTimer = null;

  const { isConnected } = useNetInfo();
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [seekState, setSeekState] = useState(SeekStates.NotSeeking);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [playbackState, setPlaybackState] = useState(PlaybackStates.Loading);
  const [lastPlaybackStateUpdate, setLastPlaybackStateUpdate] = useState(Date.now());
  const [error, setError] = useState('');
  const [shouldPlay, setShouldPlay] = useState(false);
  const [controlsState, setControlsState] = useState(
    props.showControlsOnLoad ? ControlStates.Shown : ControlStates.Hidden,
  );
  const [controlsOpacity] = useState(new Animated.Value(props.showControlsOnLoad ? 1 : 0));
  const [displayControls, setDisplayControls] = useState(true);
  const [selectedQuality, setSelectedQualiy] = useState(0);
  const [isQualitySelectorVisible, setQualitySelectorVisibility] = useState(false);

  useEffect(() => {
    setAudio();
  }, []);

  const setAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (e) {
      new Error(e);
    }
  };

  const resetControlsTimer = () => {
    const { hideControlsTimerDuration = 4000 } = props;

    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }

    controlsTimer = setTimeout(() => onTimerDone(), hideControlsTimerDuration);
  };

  const onTimerDone = () => {
    // After the controls timer runs out, fade away the controls slowly
    setControlsState(ControlStates.Hiding);
    hideControls();
  };

  const togglePlay = async () => {
    if (controlsState === ControlStates.Hidden) {
      return;
    }
    const shouldPlay = playbackState !== PlaybackStates.Playing;
    if (playbackInstance !== null) {
      playbackInstance.current.setStatusAsync({ shouldPlay });
    }
  };

  const toggleControls = () => {
    switch (controlsState) {
      case ControlStates.Shown:
        // If the controls are currently Shown, a tap should hide controls quickly
        setControlsState(ControlStates.Hiding);
        hideControls(true);
        setQualitySelectorVisibility(false);
        setDisplayControls(false);
        break;
      case ControlStates.Hidden:
        // If the controls are currently, show controls with fade-in animation
        showControls();
        setDisplayControls(true);
        setControlsState(ControlStates.Showing);
        break;
      case ControlStates.Hiding:
        // If controls are fading out, a tap should reverse, and show controls
        setControlsState(ControlStates.Showing);
        showControls();
        setDisplayControls(true);
        break;
      case ControlStates.Showing:
        // A tap when the controls are fading in should do nothing
        break;
    }
  };

  const showControls = () => {
    const { fadeInDuration = 150 } = props;

    showingAnimation = Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: fadeInDuration,
      useNativeDriver: true,
    });

    showingAnimation.start(({ finished }) => {
      if (finished) {
        setControlsState(ControlStates.Shown);
        resetControlsTimer();
      }
    });
  };

  const hideControls = (immediately = false) => {
    const { quickFadeOutDuration = 50, fadeOutDuration = 150 } = props;

    if (controlsTimer) {
      clearTimeout(controlsTimer);
      controlsTimer = null;
    }
    hideAnimation = Animated.timing(controlsOpacity, {
      toValue: 0,
      duration: immediately ? quickFadeOutDuration : fadeOutDuration,
      useNativeDriver: true,
    });
    hideAnimation.start(({ finished }) => {
      if (finished) {
        setControlsState(ControlStates.Hidden);
        setQualitySelectorVisibility(false);
      }
    });
  };

  const isPlayingOrBufferingOrPaused = status => {
    if (!status.isLoaded) {
      return PlaybackStates.Error;
    }
    if (status.isPlaying) {
      return PlaybackStates.Playing;
    }
    if (status.isBuffering) {
      return PlaybackStates.Buffering;
    }

    return PlaybackStates.Paused;
  };

  // Duration
  const getMMSSFromMillis = millis => {
    const totalSeconds = millis / 1000;
    const seconds = String(Math.floor(totalSeconds % 60));
    const minutes = String(Math.floor(totalSeconds / 60));

    return minutes.padStart(2, '0') + ':' + seconds.padStart(2, '0');
  };

  // Slider
  const onSeekBarTap = e => {
    if (
      !(
        playbackState === PlaybackStates.Loading ||
        playbackState === PlaybackStates.Ended ||
        playbackState === PlaybackStates.Error
      )
    ) {
      const value = e.nativeEvent.locationX / sliderWidth;
      onSeekSliderValueChange();
      onSeekSliderSlidingComplete(value);
    }
  };

  const onSliderLayout = e => {
    setSliderWidth(e.nativeEvent.layout.width);
  };

  const getSeekSliderPosition = () => {
    if (playbackInstance !== null && duration !== 0) {
      return position / duration;
    }
    return 0;
  };

  const updateSeekState = newSeekState => {
    setSeekState(newSeekState);
  };

  const onSeekSliderValueChange = async () => {
    if (playbackInstance !== null && seekState !== SeekStates.Seeking) {
      updateSeekState(SeekStates.Seeking);
      shouldPlayAtEndOfSeek = seekState === SeekStates.Seeked ? shouldPlayAtEndOfSeek : shouldPlay;
      // Pause the video
      await playbackInstance.current.setStatusAsync({ shouldPlay: false });
    }
  };

  const onSeekSliderSlidingComplete = async value => {
    if (playbackInstance !== null) {
      const { debug } = props;
      updateSeekState(SeekStates.Seeked);
      updatePlaybackState(shouldPlayAtEndOfSeek ? PlaybackStates.Buffering : PlaybackStates.Paused);
      try {
        const playback = await playbackInstance.current.setStatusAsync({
          positionMillis: value * duration,
          shouldPlay: true,
        });
        updateSeekState(SeekStates.NotSeeking);
        updatePlaybackState(isPlayingOrBufferingOrPaused(playback));
      } catch (e) {
        debug && console.error('Seek error: ', e);
      }
    }
  };

  // Handle events during playback
  const updatePlaybackState = async newPlaybackState => {
    if (playbackState !== newPlaybackState) {
      setPlaybackState(newPlaybackState);
      setLastPlaybackStateUpdate(Date.now());
    }
  };

  const updatePlaybackCallback = async status => {
    if (status.isLoaded) {
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      setShouldPlay(status.shouldPlay);

      if (seekState === SeekStates.NotSeeking && playbackState !== PlaybackStates.Ended) {
        if (status.didJustFinish && !status.isLooping) {
          updatePlaybackState(PlaybackStates.Ended);
        } else {
          if (!isConnected && status.isBuffering) {
            const errorMsg =
              'You are probably offline. Please make sure you are connected to the Internet to watch this video';
            updatePlaybackState(PlaybackStates.Error);
            setError(errorMsg);
          } else {
            updatePlaybackState(isPlayingOrBufferingOrPaused(status));
          }
        }
      }
    } else {
      if (status.error) {
        const errorMsg = `Encountered a fatal error during playback: ${status.error}`;
        setPlaybackState(PlaybackStates.Error);
        setError(errorMsg);
      }
    }
  };

  const toggleQualitySelector = async () => {
    setQualitySelectorVisibility(!isQualitySelectorVisible);
  };

  const {
    title,
    preview,
    defaultSource,
    sources,
    resizeMode = ExpoVideo.RESIZE_MODE_CONTAIN,
    width,
    height = width * 0.563,
    inFullscreen,
    onFullscreenOff,
    onFullscreenOn,
    topControlsAdditionalComponent,
    bottomControlsAdditionalComponent,
    minimizeIcon = defaultMinimizeIcon,
    maximizeIcon = defaultMaximizeIcon,
    pauseIcon = defaultPauseIcon,
    playIcon = defaultPlayIcon,
    acitivityIndicator = defaultActivityIndicator,
    settingsIcon = defaultSettingsIcon(isQualitySelectorVisible),
    sliderProps,
    sliderStyles,
    durationTextStyles,
    positionTextStyles,
    titleStyles,
    ...videoProps
  } = props;

  const sourcesList = [{ quality: 'auto', url: defaultSource, id: 'quality-auto' }, ...sources];

  const keyExtractor = item => String(item.id);

  const renderQualityItem = ({ item, index }) => (
    <TouchableOpacity onPress={() => setSelectedQualiy(index)}>
      <Text style={[styles.qualityItem, selectedQuality === index && { color: '#52aee5' }]}>{item.quality}</Text>
    </TouchableOpacity>
  );

  const renderQualitiesList = () => (
    <FlatList
      keyExtractor={keyExtractor}
      data={sourcesList}
      renderItem={renderQualityItem}
      contentContainerStyle={styles.qualitiesList}
    />
  );

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.videoContainer}>
        <ExpoVideo
          ref={playbackInstance}
          source={{ uri: sourcesList[selectedQuality].url }}
          usePoster={preview ? true : false}
          posterSource={{ uri: preview }}
          resizeMode={resizeMode}
          style={{ width, height }}
          rate={1.0}
          volume={1.0}
          onPlaybackStatusUpdate={updatePlaybackCallback}
          {...videoProps}
        />
      </View>
      {/* Controls */}
      <TouchableWithoutFeedback onPress={toggleControls}>
        <Animated.View
          style={[
            styles.controlsWrapper,
            { opacity: controlsOpacity, backgroundColor: `rgba(0,0,0,${displayControls ? 0.5 : 0})` },
          ]}>
          {displayControls && (
            <>
              <View style={[styles.topControlsContainer, !inFullscreen && { justifyContent: 'flex-end' }]}>
                {inFullscreen && (
                  <Text style={[styles.titleStyle, titleStyles]} numberOfLines={1}>
                    {title}
                  </Text>
                )}
                <View style={styles.topRightControlsContainer}>
                  {topControlsAdditionalComponent}
                  {sources && (
                    <>
                      <TouchableOpacity onPress={toggleQualitySelector} style={styles.qualityButton}>
                        {settingsIcon}
                      </TouchableOpacity>
                      {isQualitySelectorVisible && (
                        <View style={styles.qualitySelectorContainer}>
                          <View style={styles.qualitySelectorLeftSide}>
                            <View style={styles.qualitySelectorTitleContainer}>
                              <Text style={styles.qualitySelectorTitle}>QUALITY</Text>
                            </View>
                            {renderQualitiesList()}
                          </View>
                          <View style={styles.qualitySelectorRightSide}></View>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>
              {playbackState === PlaybackStates.Playing && (
                <TouchableOpacity onPress={togglePlay}>{pauseIcon}</TouchableOpacity>
              )}
              {playbackState === PlaybackStates.Paused && (
                <TouchableOpacity onPress={togglePlay}>{playIcon}</TouchableOpacity>
              )}
              {(playbackState === PlaybackStates.Buffering || playbackState === PlaybackStates.Loading) &&
                acitivityIndicator}
              <View style={[styles.bottomControlsContainer]}>
                {/* Current time display */}
                <Text style={[styles.textStyle, styles.positionText, positionTextStyles]}>
                  {getMMSSFromMillis(position)}
                </Text>
                {/* Seek bar */}
                <TouchableWithoutFeedback onLayout={onSliderLayout} onPress={onSeekBarTap}>
                  <Slider
                    style={[styles.slider, sliderStyles]}
                    thumbTintColor="#52aee5"
                    minimumTrackTintColor="#52aee5"
                    value={getSeekSliderPosition()}
                    onValueChange={onSeekSliderValueChange}
                    onSlidingComplete={onSeekSliderSlidingComplete}
                    disabled={
                      playbackState === PlaybackStates.Loading ||
                      playbackState === PlaybackStates.Ended ||
                      playbackState === PlaybackStates.Error ||
                      controlsState !== ControlStates.Shown
                    }
                    {...sliderProps}
                  />
                </TouchableWithoutFeedback>
                {/* Duration display */}
                <Text style={[styles.textStyle, styles.durationText, durationTextStyles]}>
                  {getMMSSFromMillis(duration)}
                </Text>
                {/* Additional component*/}
                {bottomControlsAdditionalComponent}
                {/* Fullscreen button */}
                {onFullscreenOff && onFullscreenOn && (
                  <TouchableOpacity onPress={inFullscreen ? onFullscreenOff : onFullscreenOn}>
                    {inFullscreen ? minimizeIcon : maximizeIcon}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </TouchableWithoutFeedback>
    </View>
  );
};
