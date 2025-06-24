import React from 'react';
import { FormGroup, Fieldset, Button, EQBandControlsGrid } from '../styles/App.styles'; // Removed TwoColumnFormLayout, ControlGroupWrapper. Added EQBandControlsGrid
import styled from 'styled-components';

// Styled for individual EQ band controls
const EQBandControl = styled.div`
  border: 1px solid #e0e0e0;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 8px; /* Slightly more rounded */
  background-color: #ffffff; /* White background for the card */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05); /* Subtle shadow */
  transition: box-shadow 0.2s ease-in-out;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.07);
  }
`;

const EQBandHeader = styled.h5`
  margin-top: 0;
  margin-bottom: 10px;
  color: #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1rem; /* Adjusted font size */
  font-weight: bold; /* Make it bold */
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
  eqBands, onAddEqBand, onRemoveEqBand, onUpdateEqBand, // Dynamic EQ props
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
    // <TwoColumnFormLayout> // This component no longer needs TwoColumnFormLayout
    // The AudioControls component will now render directly into the RightColumn of App.js
    // We can use a single ControlGroupWrapper or directly a Fieldset if that's all that's left.
    // For now, let's assume it will be wrapped in a way that fits the RightColumn.
    // If AudioControls itself needs internal columns for EQ bands, that would be a separate layout.
    // Based on the plan, the EQ bands themselves will have horizontal controls,
    // but the overall AudioControls component will just be the list of bands.

    // <ControlGroupWrapper> // Column 1 for general controls -- REMOVED
    // </ControlGroupWrapper>

    // <ControlGroupWrapper> {/* Column 2 for EQ - Now the main content */}
    <Fieldset> {/* Using Fieldset directly as the main container for EQ controls */}
      <legend>Dynamic Equalizer</legend>
      {eqBands.map(band => {
            const gainAttrs = getGainAttributes(band.type);
            return (
              <EQBandControl key={band.id}>
                <EQBandHeader>
                  <span>{band.name || `Band ID: ${band.id}`}</span>
                  <div>
                    <label htmlFor={`eqEnable-${band.id}`} style={{ marginRight: '10px', fontSize: '0.9em', fontWeight: 'normal' }}>
                      On:
                      <input
                        type="checkbox"
                        id={`eqEnable-${band.id}`}
                        data-testid={`eqEnable-${band.id}`}
                        checked={band.enabled}
                        onChange={(e) => onUpdateEqBand(band.id, { enabled: e.target.checked })}
                        disabled={isLoading || !band.editable}
                        style={{ marginLeft: '5px', verticalAlign: 'middle' }}
                      />
                    </label>
                    {band.removable && (
                      <SmallButton
                        type="button"
                        onClick={() => onRemoveEqBand(band.id)}
                        disabled={isLoading}
                        data-testid={`remove-eq-${band.id}`}
                      >
                        Remove
                      </SmallButton>
                    )}
                  </div>
                </EQBandHeader>
                <div style={{ opacity: band.enabled ? 1 : 0.5, pointerEvents: band.enabled ? 'auto' : 'none' }}>
                  <EQBandControlsGrid>
                    <FormGroup>
                      <label htmlFor={`eqFreq-${band.id}`}>Frequency (Hz): {band.freq}</label>
                      <input
                        type="number"
                        id={`eqFreq-${band.id}`}
                        data-testid={`eqFreq-${band.id}`}
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
                        data-testid={`eqGain-${band.id}`}
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
                        data-testid={`eqQ-${band.id}`}
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={band.q}
                        onChange={(e) => handleBandChange(band.id, 'q', e.target.value)}
                        disabled={isLoading || !band.editable}
                      />
                    </FormGroup>
                    <FormGroup>
                      <label htmlFor={`eqType-${band.id}`}>Type:</label>
                      <select
                        id={`eqType-${band.id}`}
                        data-testid={`eqType-${band.id}`}
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
                  </EQBandControlsGrid>
                </div> {/* End of conditionally disabled div */}
              </EQBandControl>
            );
          })}
          <Button type="button" onClick={onAddEqBand} disabled={isLoading} style={{fontSize: '0.9em', padding: '8px 12px', marginTop: '10px'}}>
            Add EQ Band
          </Button>
        </Fieldset>
      // </ControlGroupWrapper> // Removed as Fieldset is now the main container
    // </TwoColumnFormLayout> // Removed
  );
};

export default AudioControls;
