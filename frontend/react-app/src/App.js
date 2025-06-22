import React, { useState } from 'react';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [denoisedAudio, setDenoisedAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setDenoisedAudio(null); // Reset previous denoised audio
    setError(''); // Reset previous error
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('Please select an audio file first.');
      return;
    }

    setIsLoading(true);
    setError('');
    setDenoisedAudio(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // Assuming the FastAPI backend is running on http://localhost:8000
      // You might need to configure a proxy in package.json or adjust this URL
      const response = await fetch('http://localhost:8000/denoise/', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDenoisedAudio(url);

    } catch (err) {
      console.error('Error denoising audio:', err);
      setError(err.message || 'Failed to denoise audio. Please check the console for more details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Audio Denoising App</h1>
      </header>
      <main>
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="audioFile">Upload Audio File (wav, mp3, flac):</label>
            <input
              type="file"
              id="audioFile"
              accept=".wav,.mp3,.flac"
              onChange={handleFileChange}
            />
          </div>
          <button type="submit" disabled={isLoading || !selectedFile}>
            {isLoading ? 'Denoising...' : 'Denoise Audio'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {denoisedAudio && (
          <div className="audio-player">
            <h2>Denoised Audio:</h2>
            <audio controls src={denoisedAudio}>
              Your browser does not support the audio element.
            </audio>
            <a href={denoisedAudio} download={`denoised_${selectedFile?.name || 'audio.wav'}`}>
              Download Denoised Audio
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
