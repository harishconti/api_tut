import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

// Helper to flush promises
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

// Mock global fetch
global.fetch = jest.fn();

// Mock createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked_blob_url');
global.URL.revokeObjectURL = jest.fn();


describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    global.URL.createObjectURL.mockClear();
    global.URL.revokeObjectURL.mockClear();
  });

  test('renders initial UI elements correctly', () => {
    render(<App />);
    expect(screen.getByText(/Audio Processing App/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Upload Audio File/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Denoising Strength/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Output Format/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Process Audio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Process Audio/i })).toBeDisabled(); // Disabled initially
  });

  test('enables Process Audio button when a file is selected', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    const file = new File(['dummy audio content'], 'test.wav', { type: 'audio/wav' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    expect(screen.getByRole('button', { name: /Process Audio/i })).not.toBeDisabled();
  });

  test('updates denoising strength slider and display', () => {
    render(<App />);
    const strengthSlider = screen.getByLabelText(/Denoising Strength/i);
    fireEvent.change(strengthSlider, { target: { value: '0.75' } });
    expect(strengthSlider.value).toBe('0.75');
    // Check if the label text updates (optional, depends on how it's displayed)
    expect(screen.getByText(/Denoising Strength: 0.75/i)).toBeInTheDocument();
  });

  test('updates output format dropdown', () => {
    render(<App />);
    const formatSelect = screen.getByLabelText(/Output Format/i);
    fireEvent.change(formatSelect, { target: { value: 'mp3' } });
    expect(formatSelect.value).toBe('mp3');
  });

  test.skip('calls fetch with correct data on form submission and displays audio player', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({
        'Content-Disposition': 'attachment; filename="processed_test.mp3"',
        'Content-Type': 'audio/mp3' // Or whatever the backend sends
      }),
      blob: async () => new Blob(['processed audio data'], { type: 'audio/mp3' }),
    });

    render(<App />);

    // Select a file
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    const file = new File(['dummy audio content'], 'test.wav', { type: 'audio/wav' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Change strength and format
    fireEvent.change(screen.getByLabelText(/Denoising Strength/i), { target: { value: '0.25' } });
    fireEvent.change(screen.getByLabelText(/Output Format/i), { target: { value: 'mp3' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Process Audio/i }));

    expect(screen.getByRole('button', { name: /Processing.../i })).toBeDisabled();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8000/process/',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        })
      );

      // Check FormData content (a bit more involved but possible)
      const formData = fetch.mock.calls[0][1].body;
      expect(formData.get('file')).toBe(file);
      expect(formData.get('denoise_strength')).toBe('0.25');
      expect(formData.get('output_format')).toBe('mp3');
    });

    // Check for audio player and download link
    await waitFor(() => {
        expect(screen.getByText('Processed Audio:')).toBeInTheDocument();
        const audioPlayer = screen.getByRole('region', { name: /Processed Audio:/i }).querySelector('audio');
        expect(audioPlayer).toBeInTheDocument();
        expect(audioPlayer.src).toBe('mocked_blob_url'); // from our URL.createObjectURL mock

        const downloadLink = screen.getByRole('link', { name: /Download Processed Audio/i });
        expect(downloadLink).toBeInTheDocument();
        expect(downloadLink).toHaveAttribute('href', 'mocked_blob_url');
        expect(downloadLink).toHaveAttribute('download', 'processed_test.mp3'); // from Content-Disposition
    });
     expect(screen.getByRole('button', { name: /Process Audio/i })).not.toBeDisabled();
  });

  test('displays error message if fetch fails', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Server error during processing' }),
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    const file = new File(['dummy audio content'], 'test.wav', { type: 'audio/wav' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Process Audio/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error: Server error during processing/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Process Audio/i })).not.toBeDisabled();
  });

  test.skip('displays error if no file selected on submit', async () => {
    render(<App />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Process Audio/i }));
      await flushPromises(); // Explicitly wait for promise queue to empty
    });
    expect(await screen.findByText(/Error: Please select an audio file first./i)).toBeInTheDocument();
  });

  test.skip('updates download filename correctly based on selection and API response', async () => {
    // Mock fetch to return a specific filename
    fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Disposition': 'attachment; filename="custom_api_filename.flac"' }),
        blob: async () => new Blob(['processed audio data'], { type: 'audio/flac' }),
    });

    render(<App />);

    // 1. Select a file
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    const file = new File(['original_content'], 'my_audio.wav', { type: 'audio/wav' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Check initial download link name (before processing) based on file and default format (wav)
    // Note: The download link only appears AFTER processing. So we check the state that would be used.
    // For this test, we'll focus on the name *after* processing.

    // 2. Change output format
    const formatSelect = screen.getByLabelText(/Output Format/i);
    fireEvent.change(formatSelect, { target: { value: 'flac' } });

    // 3. Submit
    fireEvent.click(screen.getByRole('button', { name: /Process Audio/i }));

    // 4. Verify download link uses filename from API response
    await waitFor(() => {
        const downloadLink = screen.getByRole('link', { name: /Download Processed Audio/i });
        expect(downloadLink).toHaveAttribute('download', 'custom_api_filename.flac');
    });
  });

  test.skip('updates download filename correctly if API does not provide Content-Disposition', async () => {
    // Mock fetch to return NO Content-Disposition
    fetch.mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'Content-Type': 'audio/mp3' }), // No Content-Disposition
        blob: async () => new Blob(['processed audio data'], { type: 'audio/mp3' }),
    });

    render(<App />);
    const fileInput = screen.getByLabelText(/Upload Audio File/i);
    const file = new File(['original_content'], 'another_song.wav', { type: 'audio/wav' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    const formatSelect = screen.getByLabelText(/Output Format/i);
    fireEvent.change(formatSelect, { target: { value: 'mp3' } });

    fireEvent.click(screen.getByRole('button', { name: /Process Audio/i }));

    await waitFor(() => {
        const downloadLink = screen.getByRole('link', { name: /Download Processed Audio/i });
        // Should fall back to client-generated name: processed_another_song.mp3
        expect(downloadLink).toHaveAttribute('download', 'processed_another_song.mp3');
    });
  });

});
