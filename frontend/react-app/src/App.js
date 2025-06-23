import React, { useState, useEffect } from 'react';
import './App.css';

const SUPPORTED_OUTPUT_FORMATS = ["wav", "mp3", "flac"];

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedAudio, setProcessedAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [denoiseStrength, setDenoiseStrength] = useState(0.5); // Default strength
  const [outputFormat, setOutputFormat] = useState('wav'); // Default output format
  const [downloadFilename, setDownloadFilename] = useState('processed_audio.wav');

  // New states for EQ, Normalization, and Waveform
  const [eqLowCutGain, setEqLowCutGain] = useState(0); // Represents gain for a low-frequency band (simulating cut)
  const [eqClarityGain, setEqClarityGain] = useState(0); // For vocal clarity band
  const [eqPresenceGain, setEqPresenceGain] = useState(0); // For presence/sibilance band
  const [applyNormalization, setApplyNormalization] = useState(false);
  const [requestWaveform, setRequestWaveform] = useState(true); // Default to true to show waveforms
  const [originalWaveform, setOriginalWaveform] = useState(null);
  const [processedWaveform, setProcessedWaveform] = useState(null);


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setProcessedAudio(null); // Reset previous processed audio
    setOriginalWaveform(null); // Reset waveforms
    setProcessedWaveform(null); // Reset waveforms
    setError(''); // Reset previous error
    if (file) {
      const parts = file.name.split('.');
      const originalNameWithoutExtension = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
      setDownloadFilename(`processed_${originalNameWithoutExtension}.${outputFormat}`);
    }
  };

  const handleStrengthChange = (event) => {
    setDenoiseStrength(parseFloat(event.target.value));
  };

  const handleFormatChange = (event) => {
    const newFormat = event.target.value;
    setOutputFormat(newFormat);
    if (selectedFile) {
      const parts = selectedFile.name.split('.');
      const originalNameWithoutExtension = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
      setDownloadFilename(`processed_${originalNameWithoutExtension}.${newFormat}`);
    } else {
      setDownloadFilename(`processed_audio.${newFormat}`);
    }
  };

  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.name.split('.');
      const originalNameWithoutExtension = (parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]) || 'audio';
      setDownloadFilename(`processed_${originalNameWithoutExtension}.${outputFormat}`);
    }
  }, [selectedFile, outputFormat]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select an audio file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setProcessedAudio(null);
    setOriginalWaveform(null);
    setProcessedWaveform(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('denoise_strength', denoiseStrength);
    formData.append('output_format', outputFormat);
    formData.append('apply_normalization', String(applyNormalization)); // Booleans need to be string for FormData
    formData.append('request_waveform', String(requestWaveform));

    // Construct EQ bands
    const eqBands = [];
    if (eqLowCutGain < 0) { // Only add if gain is applied (negative for cut)
      eqBands.push({ freq: 100, gain: eqLowCutGain, q: 0.7 });
    }
    if (eqClarityGain !== 0) {
      eqBands.push({ freq: 2500, gain: eqClarityGain, q: 1.4 });
    }
    if (eqPresenceGain !== 0) {
      eqBands.push({ freq: 5000, gain: eqPresenceGain, q: 2.0 });
    }

    if (eqBands.length > 0) {
      formData.append('eq_bands_json', JSON.stringify(eqBands));
    }

    try {
      const response = await fetch('http://localhost:8000/process/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred during processing' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      if (requestWaveform) {
        const data = await response.json();
        // Decode base64 audio
        const audioBytes = Uint8Array.from(atob(data.audio_b64), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: `audio/${data.audio_format || outputFormat}` });
        const audioUrl = URL.createObjectURL(audioBlob);

        setProcessedAudio(audioUrl);
        setOriginalWaveform(data.original_waveform);
        setProcessedWaveform(data.processed_waveform);
        setDownloadFilename(data.audio_filename || `processed_audio.${data.audio_format || outputFormat}`);
      } else {
        // Handle as a direct audio stream (blob)
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setProcessedAudio(url);

        // Extract filename from Content-Disposition header
        const disposition = response.headers.get('Content-Disposition');
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            let filename = matches[1].replace(/['"]/g, '');
            setDownloadFilename(filename);
          } else {
            // Fallback if filename parsing fails but disposition exists
            setDownloadFilename(`processed_audio.${outputFormat}`);
          }
        } else {
           // Fallback if no Content-Disposition
           const parts = selectedFile.name.split('.');
           const originalNameWithoutExtension = (parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0]) || 'audio';
           setDownloadFilename(`processed_${originalNameWithoutExtension}.${outputFormat}`);
        }
      }

    } catch (err) {
      console.error('Error processing audio:', err);
      setError(err.message || 'Failed to process audio. Please check the console for more details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Processing App</h1>
      </header>
      <main>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="audioFile">Upload Audio File (wav, mp3, flac):</label>
            <input
              type="file"
              id="audioFile"
              accept=".wav,.mp3,.flac"
              onChange={handleFileChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="denoiseStrength">Denoising Strength: {denoiseStrength.toFixed(2)}</label>
            <input
              type="range"
              id="denoiseStrength"
              min="0"
              max="1"
              step="0.01"
              value={denoiseStrength}
              onChange={handleStrengthChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="outputFormat">Output Format:</label>
            <select id="outputFormat" value={outputFormat} onChange={handleFormatChange}>
              {SUPPORTED_OUTPUT_FORMATS.map(format => (
                <option key={format} value={format}>{format.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* --- EQ Controls --- */}
          <fieldset className="form-group">
            <legend>Equalizer Settings (Vocal Focus)</legend>
            <div className="form-group">
              <label htmlFor="eqLowCutGain">Low Cut (100Hz Gain): {eqLowCutGain} dB</label>
              <input
                type="range"
                id="eqLowCutGain"
                min="-24"
                max="0"
                step="1"
                value={eqLowCutGain}
                onChange={(e) => setEqLowCutGain(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="eqClarityGain">Vocal Clarity (2.5kHz Gain): {eqClarityGain} dB</label>
              <input
                type="range"
                id="eqClarityGain"
                min="-6"
                max="6"
                step="0.5"
                value={eqClarityGain}
                onChange={(e) => setEqClarityGain(parseFloat(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label htmlFor="eqPresenceGain">Presence/Sibilance (5kHz Gain): {eqPresenceGain} dB</label>
              <input
                type="range"
                id="eqPresenceGain"
                min="-6"
                max="6"
                step="0.5"
                value={eqPresenceGain}
                onChange={(e) => setEqPresenceGain(parseFloat(e.target.value))}
              />
            </div>
          </fieldset>

          {/* --- Normalization Control --- */}
          <div className="form-group">
            <label htmlFor="applyNormalization">
              <input
                type="checkbox"
                id="applyNormalization"
                checked={applyNormalization}
                onChange={(e) => setApplyNormalization(e.target.checked)}
              />
              Apply Loudness Normalization (-23 LUFS)
            </label>
          </div>

          {/* --- Request Waveform Control --- */}
          <div className="form-group">
            <label htmlFor="requestWaveform">
              <input
                type="checkbox"
                id="requestWaveform"
                checked={requestWaveform}
                onChange={(e) => setRequestWaveform(e.target.checked)}
              />
              Display Waveforms
            </label>
          </div>


          <button type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? 'Processing...' : 'Process Audio'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {/* --- Waveform Displays --- */}
        {requestWaveform && selectedFile && (
          <div className="waveforms-section">
            <WaveformDisplay data={originalWaveform} title="Original Waveform" />
            <WaveformDisplay data={processedWaveform} title="Processed Waveform" />
          </div>
        )}

        {processedAudio && (
          <div className="audio-player">
            <h2>Processed Audio:</h2>
            <audio controls src={processedAudio}>
              Your browser does not support the audio element.
            </audio>
            <a href={processedAudio} download={downloadFilename}>
              Download Processed Audio
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

// Simple Waveform Display Component
const WaveformDisplay = ({ data, title, width = 300, height = 100 }) => {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    if (canvasRef.current && data && data.length > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height); // Clear canvas

      ctx.fillStyle = '#ddd'; // Background
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#007bff'; // Waveform color
      ctx.lineWidth = 1;

      const step = width / data.length;
      const middle = height / 2;

      ctx.beginPath();
      ctx.moveTo(0, middle);

      data.forEach((val, i) => {
        // Assuming data is normalized 0-1 (peak value)
        // We'll draw it symmetrically around the middle line
        const yTop = middle - (val * middle);
        const yBottom = middle + (val * middle);

        // For a simple peak envelope:
        ctx.lineTo(i * step, yTop);
        // then move to bottom and back to middle for next point to create the filled envelope look
      });
      // Draw the top envelope
      ctx.stroke();

      // Draw the bottom envelope (mirrored)
      ctx.beginPath();
      ctx.moveTo(0, middle);
      data.forEach((val, i) => {
         const yBottom = middle + (val * middle);
         ctx.lineTo(i * step, yBottom);
      });
      ctx.stroke();


    } else if (canvasRef.current) {
      // Clear canvas if no data
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'center';
      ctx.fillText('No waveform data', width / 2, height / 2);
    }
  }, [data, width, height]);

  return (
    <div className="waveform-container">
      <h4>{title}</h4>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  );
};

export default App;
