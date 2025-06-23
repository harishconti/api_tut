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

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setProcessedAudio(null); // Reset previous processed audio
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

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('denoise_strength', denoiseStrength);
    formData.append('output_format', outputFormat);

    try {
      const response = await fetch('http://localhost:8000/process/', { // Updated endpoint
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setProcessedAudio(url);

      // Extract filename from Content-Disposition header if available
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          let filename = matches[1].replace(/['"]/g, '');
          setDownloadFilename(filename);
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

          <button type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? 'Processing...' : 'Process Audio'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
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

export default App;
