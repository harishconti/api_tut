import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import App from './App'; // Corrected path from App.js perspective
import * as api from './api'; // Import all exports from api.js to mock `processAudio`

// Mock the api module
jest.mock('./api');

// Mock react-toastify
jest.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container"></div>, // Mocked ToastContainer
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));


describe('App Component', () => {
  const mockFile = new File(['dummy audio content'], 'test.wav', { type: 'audio/wav' });

  beforeEach(() => {
    // Reset mocks before each test
    api.processAudio.mockClear();
    jest.clearAllMocks();

    // If AudioPlayer component directly uses createObjectURL, it should be mocked,
    // potentially in setupTests.js or here if not globally.
    // For now, we assume the component structure and api.js mock handle this.
    // global.URL.createObjectURL = jest.fn(() => 'mocked_blob_url_app_test');
    // global.URL.revokeObjectURL = jest.fn();
  });

  test('renders initial UI elements correctly', () => {
    render(<App />);
    expect(screen.getByText(/Audio Processing App/i)).toBeInTheDocument();
    // FileUpload component is a child, check for its label
    expect(screen.getByLabelText(/Upload Audio File/i)).toBeInTheDocument();
    // AudioControls is a child, check for one of its labels
    expect(screen.getByLabelText(/Denoising Strength/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Process Audio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Process Audio/i })).toBeDisabled();
  });

  test('enables Process Audio button when a file is selected', async () => {
    const user = userEvent.setup();
    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i); // From FileUpload component
    await user.upload(fileInput, mockFile);
    expect(screen.getByRole('button', { name: /Process Audio/i })).not.toBeDisabled();
  });

  test('calls processAudioAPI with correct FormData on submission (basic)', async () => {
    const user = userEvent.setup();
    api.processAudio.mockResolvedValue({ // Mock successful response
      audioUrl: 'mocked_url_basic',
      downloadFilename: 'processed_test.wav',
      isJson: false,
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    await user.upload(fileInput, mockFile);

    const strengthSlider = screen.getByLabelText(/Denoising Strength/i);
    fireEvent.change(strengthSlider, { target: { value: '0.3' } });

    const formatSelect = screen.getByLabelText(/Output Format/i);
    await user.selectOptions(formatSelect, 'mp3');

    const processButton = screen.getByRole('button', { name: /Process Audio/i });
    await user.click(processButton);

    expect(api.processAudio).toHaveBeenCalledTimes(1);
    const formData = api.processAudio.mock.calls[0][0];
    expect(formData.get('file')).toBe(mockFile);
    expect(formData.get('denoise_strength')).toBe('0.3');
    expect(formData.get('output_format')).toBe('mp3');
    expect(formData.get('apply_normalization')).toBe('false'); // Default
    expect(formData.get('request_waveform')).toBe('true'); // Default in App.js state
    expect(formData.get('eq_bands_json')).toBeNull(); // Default, no active bands

    // Assuming AudioPlayer component renders an <audio> tag or a specific test-id
    // We need to ensure AudioPlayer is updated to include a data-testid for its main container or audio element
    // For now, let's check if the toast message for success appeared.
    await waitFor(() => {
      expect(jest.requireMock('react-toastify').toast.success).toHaveBeenCalledWith("Audio processed successfully!");
    });
    // And that the AudioPlayer component has received the URL
    // This requires AudioPlayer to render something identifiable with the new URL
    // e.g. if AudioPlayer had <audio data-testid="audio-element" src={processedAudio} />
    // await waitFor(() => {
    //   const audioElement = screen.getByTestId('audio-element');
    //   expect(audioElement.src).toBe('mocked_url_basic');
    // });
  });

  test('calls processAudioAPI with EQ bands, normalization, and waveform request', async () => {
    const user = userEvent.setup();
    api.processAudio.mockResolvedValue({
      audioUrl: 'mocked_url_advanced',
      downloadFilename: 'processed_eq_norm_wave.wav',
      isJson: true,
      original_waveform: [0.1, 0.2],
      processed_waveform: [0.3, 0.4],
      audio_filename: "processed_eq_norm_wave.wav", // Ensure these are part of mock if App uses them
      audio_format: "wav",
      denoise_strength_applied: 0.1,
      eq_bands_applied: [{ freq: 100, gain: -3, q: 0.7, type: "lowshelf" }], // Match the band being modified
      normalization_applied: true
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    await user.upload(fileInput, mockFile);

    // Enable normalization
    const normCheckbox = screen.getByLabelText(/Apply Loudness Normalization/i);
    await user.click(normCheckbox);

    // Ensure waveform request is true (it's default)
    const waveformCheckbox = screen.getByLabelText(/Display Waveforms/i);
    expect(waveformCheckbox.checked).toBe(true);


    // Modify an existing EQ band to make it "active"
    // Default bands in App.js: { id: 'lowcut', freq: 100, gain: 0, q: 0.7, type: 'lowshelf', ... }
    const gainInputLowCut = screen.getByTestId('eqGain-lowcut');
    fireEvent.change(gainInputLowCut, { target: { value: '-3' } });

    const processButton = screen.getByRole('button', { name: /Process Audio/i });
    await user.click(processButton);

    expect(api.processAudio).toHaveBeenCalledTimes(1);
    const formData = api.processAudio.mock.calls[0][0];
    expect(formData.get('apply_normalization')).toBe('true');
    expect(formData.get('request_waveform')).toBe('true');

    const eqBandsJson = formData.get('eq_bands_json');
    expect(eqBandsJson).not.toBeNull();
    const parsedEqBands = JSON.parse(eqBandsJson);
    // The first default band is 'lowcut'. If its gain is changed, it should be included.
    expect(parsedEqBands).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ freq: 100, gain: -3, q: 0.7, type: 'lowshelf' })
        ])
    );
    // Check that other default bands with gain 0 are NOT included.
    // Default: { id: 'clarity', freq: 2500, gain: 0, q: 1.4, type: 'peaking', enabled: true ... }
    // Default: { id: 'presence', freq: 5000, gain: 0, q: 2.0, type: 'peaking', enabled: true ... }
    // These bands have gain 0, so they should not be included in activeEqBands sent to backend.
    expect(parsedEqBands.find(band => band.freq === 2500)).toBeUndefined();
    expect(parsedEqBands.find(band => band.freq === 5000)).toBeUndefined();

    // Now, let's test disabling an active band
    // Disable the 'lowcut' band which we previously made active by setting its gain
    const enableToggleLowCut = screen.getByTestId('eqEnable-lowcut');
    await user.click(enableToggleLowCut); // Toggle it off

    // Re-submit
    await user.click(processButton);
    expect(api.processAudio).toHaveBeenCalledTimes(2); // Called again
    const formDataSecondCall = api.processAudio.mock.calls[1][0];
    const eqBandsJsonSecondCall = formDataSecondCall.get('eq_bands_json');
    if (eqBandsJsonSecondCall) { // If not null (i.e. some bands are still active and enabled)
        const parsedEqBandsSecondCall = JSON.parse(eqBandsJsonSecondCall);
        // The 'lowcut' band should now be missing because it's disabled
        expect(parsedEqBandsSecondCall.find(band => band.freq === 100)).toBeUndefined();
    } else {
        // If all bands become effectively inactive (e.g. no other bands had gain changes)
        // then eq_bands_json might be null, which is also correct.
        // This depends on the initial state of other bands. For this test, it's fine if it's null
        // as we only explicitly activated and then disabled one.
    }

    await waitFor(() => {
      expect(screen.getByText('Original Waveform')).toBeInTheDocument();
      expect(screen.getByText('Processed Waveform')).toBeInTheDocument();
    });
    expect(jest.requireMock('react-toastify').toast.success).toHaveBeenCalledWith("Audio processed successfully!");
  });


  test('handles API error gracefully with toast notification', async () => {
    const user = userEvent.setup();
    const errorMessage = "Backend processing failed spectacularly";
    api.processAudio.mockRejectedValue(new Error(errorMessage));

    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    await user.upload(fileInput, mockFile);

    const processButton = screen.getByRole('button', { name: /Process Audio/i });
    await user.click(processButton);

    await waitFor(() => {
      expect(api.processAudio).toHaveBeenCalledTimes(1);
    });

    expect(jest.requireMock('react-toastify').toast.error).toHaveBeenCalledWith(errorMessage);
    expect(screen.getByRole('button', { name: /Process Audio/i })).not.toBeDisabled(); // Loading state reset
  });

  test('shows toast error if no file selected on submit', async () => {
    const user = userEvent.setup();
    render(<App />);
    const processButton = screen.getByRole('button', { name: /Process Audio/i });
    await user.click(processButton);

    expect(api.processAudio).not.toHaveBeenCalled();
    expect(jest.requireMock('react-toastify').toast.error).toHaveBeenCalledWith('Please select an audio file first.');
  });

});

// Note: For full verification of audio player updates, the AudioPlayer component
// would ideally have a data-testid on its <audio> element, e.g., data-testid="audio-element".
// Then one could assert:
// const audioElement = await screen.findByTestId('audio-element');
// expect(audioElement.src).toBe('mocked_url_basic');
// This is currently commented out as it requires internal changes to AudioPlayer or App.js structure for testability.
// The WaveformDisplay tests also rely on the titles being present.
// The test for active EQ bands assumes the default bands provided in App.js and their IDs.
// Specifically, `eqGain-lowcut` data-testid is assumed to exist from AudioControls.js.
// If AudioPlayer.js or WaveformDisplay.js need specific props for testing, those components might need minor test-id additions.
// The App.js test for basic submission needs to identify the audio player more reliably.
// Let's assume AudioPlayer renders a container with data-testid="audio-player-component"
// In App.js: <AudioPlayer data-testid="audio-player-component" ... />
// In test: await waitFor(() => expect(screen.getByTestId('audio-player-component')).toBeInTheDocument());
// This is more robust than checking for the "Processed Audio:" text which might change.
// For now, checking for toast success message is an indirect way to confirm successful processing flow.
// Adding data-testid="audio-player" to the AudioPlayer component in App.js would be beneficial.
// Example: <AudioPlayer data-testid="audio-player" ... />
// Then in test: await waitFor(() => expect(screen.getByTestId('audio-player')).toBeInTheDocument());
// I will add this data-testid to App.js where AudioPlayer is rendered.
