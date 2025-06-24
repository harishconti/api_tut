import React from 'react';
import { FormGroup, Fieldset, TwoColumnFormLayout, ControlGroupWrapper, Button } from '../styles/App.styles'; // Added Button
import styled from 'styled-components';

// Styled for individual EQ band controls
const EQBandControl = styled.div`
  border: 1px solid #e0e0e0;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 6px;
  background-color: #f9f9f9;
`;

const EQBandHeader = styled.h5`
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SmallButton = styled(Button)` // Inherits from main Button but smaller
  padding: 5px 10px;
  font-size: 0.8em;
  background-color: #6c757d;
  &:hover {
    background-color: #5a6268;
  }
`;


const AudioControls = ({
  denoiseStrength, onDenoiseStrengthChange,
  outputFormat, onOutputFormatChange, supportedFormats,
  eqBands, onAddEqBand, onRemoveEqBand, onUpdateEqBand, // Dynamic EQ props
  applyNormalization, onApplyNormalizationChange,
  requestWaveform, onRequestWaveformChange,
  isLoading
}) => {

  const handleBandChange = (id, field, value) => {
    const numericValue = field === 'freq' || field === 'gain' || field === 'q' ? parseFloat(value) : value;
    onUpdateEqBand(id, { [field]: numericValue });
  };

  // Define min/max/step for gain based on type, or use defaults
  const getGainAttributes = (type) => {
    if (type === 'lowshelf' || type === 'highshelf') {
      return { min: -24, max: 6, step: 0.5 }; // Shelves can often cut more
    }
    return { min: -12, max: 12, step: 0.5 }; // Peaking default
  };

  return (
    <TwoColumnFormLayout>
      <ControlGroupWrapper> {/* Column 1 for general controls */}
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
      </ControlGroupWrapper>

      <ControlGroupWrapper> {/* Column 2 for EQ */}
        <Fieldset>
          <legend>Dynamic Equalizer</legend>
          {eqBands.map(band => {
            const gainAttrs = getGainAttributes(band.type);
            return (
              <EQBandControl key={band.id}>
                <EQBandHeader>
                  {band.name || `Band ID: ${band.id}`}
                  {band.removable && (
                    <SmallButton type="button" onClick={() => onRemoveEqBand(band.id)} disabled={isLoading}>
                      Remove
                    </SmallButton>
                  )}
                </EQBandHeader>
                <FormGroup>
                  <label htmlFor={`eqFreq-${band.id}`}>Frequency (Hz): {band.freq}</label>
                  <input
                    type="number" // Using number for more direct input, could be range
                    id={`eqFreq-${band.id}`}
                    min="20"
                    max="20000"
                    step="1"
                    value={band.freq}
                    onChange={(e) => handleBandChange(band.id, 'freq', e.target.value)}
                    disabled={isLoading || !band.editable}
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor={`eqGain-${band.id}`}>Gain (dB): {band.gain}</label>
                  <input
                    type="range"
                    id={`eqGain-${band.id}`}
                    min={gainAttrs.min}
                    max={gainAttrs.max}
                    step={gainAttrs.step}
                    value={band.gain}
                    onChange={(e) => handleBandChange(band.id, 'gain', e.target.value)}
                    disabled={isLoading || !band.editable}
                  />
                </FormGroup>
                <FormGroup>
                  <label htmlFor={`eqQ-${band.id}`}>Q Factor: {band.q.toFixed(1)}</label>
                  <input
                    type="range"
                    id={`eqQ-${band.id}`}
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={band.q}
                    onChange={(e) => handleBandChange(band.id, 'q', e.target.value)}
                    disabled={isLoading || !band.editable} // Q might not be editable for shelves
                  />
                </FormGroup>
                 <FormGroup>
                  <label htmlFor={`eqType-${band.id}`}>Type:</label>
                  <select
                    id={`eqType-${band.id}`}
                    value={band.type}
                    onChange={(e) => handleBandChange(band.id, 'type', e.target.value)}
                    disabled={isLoading || !band.editable}
                  >
                    <option value="peaking">Peaking</option>
                    <option value="lowshelf">Low Shelf</option>
                    <option value="highshelf">High Shelf</option>
                    {/* Add other types like lowpass, highpass, notch if backend supports */}
                  </select>
                </FormGroup>
              </EQBandControl>
            );
          })}
          <Button type="button" onClick={onAddEqBand} disabled={isLoading} style={{fontSize: '0.9em', padding: '8px 12px', marginTop: '10px'}}>
            Add EQ Band
          </Button>
        </Fieldset>
      </ControlGroupWrapper>
    </TwoColumnFormLayout>
  );
};

export default AudioControls;
