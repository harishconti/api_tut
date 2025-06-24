import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AudioControls from './AudioControls';

// Mock styled components or specific complex child components if they interfere with testing core logic
// For now, assuming they render without issue or are simple enough.

describe('AudioControls', () => {
  const mockProps = {
    denoiseStrength: 0.5,
    onDenoiseStrengthChange: jest.fn(),
    outputFormat: 'wav',
    onOutputFormatChange: jest.fn(),
    supportedFormats: ['wav', 'mp3', 'flac'],
    eqBands: [
      { id: 'b1', name: "Low Cut", freq: 100, gain: 0, q: 0.7, type: 'lowshelf', editable: true, removable: false, enabled: true },
      { id: 'b2', name: "Vocal Clarity", freq: 2500, gain: 0, q: 1.4, type: 'peaking', editable: true, removable: false, enabled: true },
    ],
    onAddEqBand: jest.fn(),
    onRemoveEqBand: jest.fn(),
    onUpdateEqBand: jest.fn(),
    applyNormalization: false,
    onApplyNormalizationChange: jest.fn(),
    requestWaveform: true,
    onRequestWaveformChange: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders all basic controls correctly', () => {
    render(<AudioControls {...mockProps} />);

    expect(screen.getByLabelText(/Denoising Strength/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output Format/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Apply Loudness Normalization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Waveforms/i)).toBeInTheDocument();
  });

  test('calls onDenoiseStrengthChange when slider is moved', () => {
    render(<AudioControls {...mockProps} />);
    const denoiseSlider = screen.getByLabelText(/Denoising Strength/i);
    fireEvent.change(denoiseSlider, { target: { value: '0.75' } });
    expect(mockProps.onDenoiseStrengthChange).toHaveBeenCalled();
  });

  test('calls onOutputFormatChange when format is selected', () => {
    render(<AudioControls {...mockProps} />);
    const formatSelect = screen.getByLabelText(/Output Format/i);
    userEvent.selectOptions(formatSelect, 'mp3');
    expect(mockProps.onOutputFormatChange).toHaveBeenCalled();
  });

  test('calls onApplyNormalizationChange when checkbox is clicked', () => {
    render(<AudioControls {...mockProps} />);
    const normalizationCheckbox = screen.getByLabelText(/Apply Loudness Normalization/i);
    fireEvent.click(normalizationCheckbox);
    expect(mockProps.onApplyNormalizationChange).toHaveBeenCalled();
  });

  test('calls onRequestWaveformChange when checkbox is clicked', () => {
    render(<AudioControls {...mockProps} />);
    const waveformCheckbox = screen.getByLabelText(/Display Waveforms/i);
    fireEvent.click(waveformCheckbox);
    expect(mockProps.onRequestWaveformChange).toHaveBeenCalled();
  });

  test('renders initial EQ bands', () => {
    render(<AudioControls {...mockProps} />);
    expect(screen.getByText('Low Cut')).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockProps.eqBands[0].freq)).toBeInTheDocument();
    expect(screen.getByText('Vocal Clarity')).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockProps.eqBands[1].freq)).toBeInTheDocument();
  });

  test('calls onAddEqBand when "Add EQ Band" button is clicked', () => {
    render(<AudioControls {...mockProps} />);
    const addButton = screen.getByRole('button', { name: /Add EQ Band/i });
    fireEvent.click(addButton);
    expect(mockProps.onAddEqBand).toHaveBeenCalledTimes(1);
  });

  test('calls onRemoveEqBand when a removable band\'s "Remove" button is clicked', () => {
    const propsWithRemovableBand = {
      ...mockProps,
      eqBands: [
        { id: 'b1', freq: 100, gain: 0, q: 0.7, type: 'lowshelf', editable: true, removable: false, name: "Low Cut" },
        { id: 'b3', freq: 1000, gain: 0, q: 1.0, type: 'peaking', editable: true, removable: true, name: "Custom Band 1" }
      ],
    };
    render(<AudioControls {...propsWithRemovableBand} />);

    // Assuming the remove button is uniquely identifiable or we get all and pick one
    // This might need more specific selectors if there are multiple remove buttons
    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    // Find the button associated with the removable band.
    // This relies on the structure: EQBandControl contains header with name and button.
    const removeButton = screen.getByTestId(`remove-eq-${propsWithRemovableBand.eqBands[1].id}`);
    userEvent.click(removeButton);
    expect(propsWithRemovableBand.onRemoveEqBand).toHaveBeenCalledWith(propsWithRemovableBand.eqBands[1].id);
  });

  test('calls onUpdateEqBand when an EQ band parameter is changed', async () => {
    const user = userEvent.setup();
    render(<AudioControls {...mockProps} />);

    const firstBand = mockProps.eqBands[0];
    const secondBand = mockProps.eqBands[1];

    // Example: Change frequency of the first band
    const freqInput = screen.getByTestId(`eqFreq-${firstBand.id}`);
    await user.clear(freqInput); // Clear existing value
    await user.type(freqInput, '120');
    // Blur to trigger change or ensure value is fully committed if component relies on blur
    fireEvent.blur(freqInput);
    expect(mockProps.onUpdateEqBand).toHaveBeenCalledWith(firstBand.id, { freq: 120 });

    // Example: Change gain of the second band (range input)
    // For range inputs, fireEvent.change is usually sufficient for testing the callback.
    // userEvent might be more complex if specific keyboard interactions for range are needed.
    const gainInputBand2 = screen.getByTestId(`eqGain-${secondBand.id}`);
    fireEvent.change(gainInputBand2, { target: { value: '3.0' } });
    expect(mockProps.onUpdateEqBand).toHaveBeenCalledWith(secondBand.id, { gain: 3.0 });

    // Example: Change Q of the second band (range input)
    const qInputBand2 = screen.getByTestId(`eqQ-${secondBand.id}`);
    fireEvent.change(qInputBand2, { target: { value: '2.5' } });
    expect(mockProps.onUpdateEqBand).toHaveBeenCalledWith(secondBand.id, { q: 2.5 });

    // Example: Change type of the first band (select input)
    const typeSelectForBand1 = screen.getByTestId(`eqType-${firstBand.id}`);
    await user.selectOptions(typeSelectForBand1, 'peaking');
    expect(mockProps.onUpdateEqBand).toHaveBeenCalledWith(firstBand.id, { type: 'peaking' });
  });

  test('disables controls when isLoading is true', () => {
    render(<AudioControls {...mockProps} isLoading={true} />);
    expect(screen.getByLabelText(/Denoising Strength/i)).toBeDisabled();
    expect(screen.getByLabelText(/Output Format/i)).toBeDisabled();
    expect(screen.getByLabelText(/Apply Loudness Normalization/i)).toBeDisabled();
    expect(screen.getByLabelText(/Display Waveforms/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Add EQ Band/i })).toBeDisabled();

    // Check that EQ band inputs are disabled
    mockProps.eqBands.forEach(band => {
      expect(screen.getByTestId(`eqEnable-${band.id}`)).toBeDisabled(); // Toggle should also be disabled
      expect(screen.getByTestId(`eqFreq-${band.id}`)).toBeDisabled();
      expect(screen.getByTestId(`eqGain-${band.id}`)).toBeDisabled();
      expect(screen.getByTestId(`eqQ-${band.id}`)).toBeDisabled();
      expect(screen.getByTestId(`eqType-${band.id}`)).toBeDisabled();
      if (band.removable) {
        expect(screen.getByTestId(`remove-eq-${band.id}`)).toBeDisabled();
      }
    });
  });

  test('renders EQ band enable toggle and calls onUpdateEqBand on change', async () => {
    const user = userEvent.setup();
    render(<AudioControls {...mockProps} />);

    const firstBand = mockProps.eqBands[0];
    const toggleSwitch = screen.getByTestId(`eqEnable-${firstBand.id}`);

    expect(toggleSwitch).toBeInTheDocument();
    expect(toggleSwitch).toBeChecked(); // Default is enabled: true

    await user.click(toggleSwitch);
    expect(mockProps.onUpdateEqBand).toHaveBeenCalledWith(firstBand.id, { enabled: false });
  });

  test('EQ band controls are visually disabled and non-interactive when band.enabled is false', () => {
    const propsWithDisabledBand = {
      ...mockProps,
      eqBands: [
        { ...mockProps.eqBands[0], enabled: false }, // Disable first band
        mockProps.eqBands[1],
      ],
    };
    render(<AudioControls {...propsWithDisabledBand} />);

    const firstBand = propsWithDisabledBand.eqBands[0];
    const freqInput = screen.getByTestId(`eqFreq-${firstBand.id}`);
    const gainInput = screen.getByTestId(`eqGain-${firstBand.id}`);
    const qInput = screen.getByTestId(`eqQ-${firstBand.id}`);
    const typeSelect = screen.getByTestId(`eqType-${firstBand.id}`);

    // Check opacity and pointerEvents via parent div style
    // The parent div of these form groups is the one with the style attribute
    expect(freqInput.closest('div[style*="opacity: 0.5"]')).toBeInTheDocument();
    expect(freqInput.closest('div[style*="pointer-events: none"]')).toBeInTheDocument();

    // Inputs themselves might not be directly disabled by the opacity style,
    // but their container makes them non-interactive.
    // However, if they were directly disabled, we could check that too.
    // For now, checking the wrapper style is sufficient to test the visual disabling.
  });
});
