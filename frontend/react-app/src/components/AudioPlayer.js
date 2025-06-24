import React from 'react';
import { StyledAudioPlayer } from '../styles/App.styles';

const AudioPlayer = ({ processedAudio, downloadFilename, audioRef, onLoadedMetadata }) => {
  if (!processedAudio) {
    return null;
  }

  return (
    <StyledAudioPlayer>
      <h2>Processed Audio:</h2>
      <audio
        controls
        src={processedAudio}
        ref={audioRef}
        onLoadedMetadata={onLoadedMetadata}
      >
        Your browser does not support the audio element.
      </audio>
      <a href={processedAudio} download={downloadFilename}>
        Download Processed Audio
      </a>
    </StyledAudioPlayer>
  );
};

export default AudioPlayer;
