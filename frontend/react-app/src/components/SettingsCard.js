import React from 'react';
import { FormGroup, SettingsCardContainer } from '../styles/App.styles';

const SettingsCard = ({
  denoiseStrength, onDenoiseStrengthChange,
  outputFormat, onOutputFormatChange, supportedFormats,
  applyNormalization, onApplyNormalizationChange,
  requestWaveform, onRequestWaveformChange,
  isLoading
}) => {
  return (
    <SettingsCardContainer>
      <h3>Settings</h3>
      <FormGroup>
        <label htmlFor="denoiseStrength">Denoising Strength: {denoiseStrength.toFixed(2)}</label>
        <input
          type="range"
          id="denoiseStrength"
          min="0"
          max="1"
          step="0.01"
          value={denoiseStrength}
          onChange={onDenoiseStrengthChange}
          disabled={isLoading}
        />
      </FormGroup>

      <FormGroup>
        <label htmlFor="outputFormat">Output Format:</label>
        <select
          id="outputFormat"
          value={outputFormat}
          onChange={onOutputFormatChange}
          disabled={isLoading}
        >
          {supportedFormats.map(format => (
            <option key={format} value={format}>{format.toUpperCase()}</option>
          ))}
        </select>
      </FormGroup>

      <FormGroup>
        <label htmlFor="applyNormalization">
          <input
            type="checkbox"
            id="applyNormalization"
            checked={applyNormalization}
            onChange={onApplyNormalizationChange}
            disabled={isLoading}
          />
          Apply Loudness Normalization (-23 LUFS)
        </label>
      </FormGroup>

      <FormGroup>
        <label htmlFor="requestWaveform">
          <input
            type="checkbox"
            id="requestWaveform"
            checked={requestWaveform}
            onChange={onRequestWaveformChange}
            disabled={isLoading}
          />
          Display Waveforms
        </label>
      </FormGroup>
    </SettingsCardContainer>
  );
};

export default SettingsCard;
