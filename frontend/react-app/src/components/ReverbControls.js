import React from 'react';
import { FormGroup, Fieldset } from '../styles/App.styles';

const ReverbControls = ({
  roomSize, onRoomSizeChange,
  wetDryMix, onWetDryMixChange,
  isLoading
}) => {
  return (
    <Fieldset>
      <legend>Reverb</legend>
      <FormGroup>
        <label htmlFor="reverbRoomSize">Room Size: {roomSize.toFixed(2)}</label>
        <input
          type="range"
          id="reverbRoomSize"
          min="0"
          max="1"
          step="0.01"
          value={roomSize}
          onChange={onRoomSizeChange}
          disabled={isLoading}
        />
      </FormGroup>
      <FormGroup>
        <label htmlFor="reverbWetDryMix">Wet/Dry Mix: {wetDryMix.toFixed(2)}</label>
        <input
          type="range"
          id="reverbWetDryMix"
          min="0"
          max="1"
          step="0.01"
          value={wetDryMix}
          onChange={onWetDryMixChange}
          disabled={isLoading}
        />
      </FormGroup>
    </Fieldset>
  );
};

export default ReverbControls;
