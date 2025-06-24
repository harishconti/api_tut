import React from 'react';
import { FormGroup, Fieldset } from '../styles/App.styles'; // Assuming Fieldset provides a good card-like container

const CompressorControls = ({
  threshold, onThresholdChange,
  ratio, onRatioChange,
  attack, onAttackChange,
  release, onReleaseChange,
  isLoading
}) => {
  return (
    <Fieldset>
      <legend>Compressor</legend>
      <FormGroup>
        <label htmlFor="compressorThreshold">Threshold: {threshold.toFixed(1)} dB</label>
        <input
          type="range"
          id="compressorThreshold"
          min="-60"
          max="0"
          step="0.5"
          value={threshold}
          onChange={onThresholdChange}
          disabled={isLoading}
        />
      </FormGroup>
      <FormGroup>
        <label htmlFor="compressorRatio">Ratio: {ratio.toFixed(1)}:1</label>
        <input
          type="range"
          id="compressorRatio"
          min="1"
          max="20"
          step="0.1"
          value={ratio}
          onChange={onRatioChange}
          disabled={isLoading}
        />
      </FormGroup>
      <FormGroup>
        <label htmlFor="compressorAttack">Attack: {attack.toFixed(1)} ms</label>
        <input
          type="range"
          id="compressorAttack"
          min="0.1"
          max="100" // Adjusted max based on common compressor values
          step="0.1"
          value={attack}
          onChange={onAttackChange}
          disabled={isLoading}
        />
      </FormGroup>
      <FormGroup>
        <label htmlFor="compressorRelease">Release: {release.toFixed(0)} ms</label>
        <input
          type="range"
          id="compressorRelease"
          min="10"
          max="1000"
          step="1"
          value={release}
          onChange={onReleaseChange}
          disabled={isLoading}
        />
      </FormGroup>
    </Fieldset>
  );
};

export default CompressorControls;
