import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileUpload from './components/FileUpload';
import AudioControls from './components/AudioControls';
import AudioPlayer from './components/AudioPlayer';
import WaveformDisplay from './components/WaveformDisplay';
import { processAudio as processAudioAPI } from './api';
import {
  AppContainer,
  AppHeader,
  MainContent,
  StyledForm,
  TwoColumnFormLayout, // Import new layout component
  ErrorMessage,
  WaveformsSection,
  Button
} from './styles/App.styles';

const SUPPORTED_OUTPUT_FORMATS = ["wav", "mp3", "flac"];

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [processedAudio, setProcessedAudio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [error, setError] = useState(''); // This will be replaced by toast notifications
  const [denoiseStrength, setDenoiseStrength] = useState(0.5);
  const [outputFormat, setOutputFormat] = useState('wav');
  const [downloadFilename, setDownloadFilename] = useState('processed_audio.wav');

  // const [eqLowCutGain, setEqLowCutGain] = useState(0); // Replaced by dynamic EQ bands
  // const [eqClarityGain, setEqClarityGain] = useState(0); // Replaced by dynamic EQ bands
  // const [eqPresenceGain, setEqPresenceGain] = useState(0); // Replaced by dynamic EQ bands
  const [eqBands, setEqBands] = useState([ // Initial default bands
    { id: 'lowcut', freq: 100, gain: 0, q: 0.7, type: 'lowshelf', editable: true, removable: false, name: "Low Cut", enabled: true },
    { id: 'clarity', freq: 2500, gain: 0, q: 1.4, type: 'peaking', editable: true, removable: false, name: "Vocal Clarity", enabled: true },
    { id: 'presence', freq: 5000, gain: 0, q: 2.0, type: 'peaking', editable: true, removable: false, name: "Presence/Sibilance", enabled: true }
  ]);
  const [applyNormalization, setApplyNormalization] = useState(false);
  const [requestWaveform, setRequestWaveform] = useState(true);
  const [originalWaveform, setOriginalWaveform] = useState(null);
  const [processedWaveform, setProcessedWaveform] = useState(null);
  const [audioDuration, setAudioDuration] = useState(0); // For storing duration of processed audio

  const audioRef = useRef(null); // Ref for the audio element

  // EQ Band Management Functions
  const handleAddEqBand = () => {
    setEqBands(prevBands => [
      ...prevBands,
      {
        id: `band-${Date.now()}`, // Simple unique ID
        freq: 1000,
        gain: 0,
        q: 1.0,
        type: 'peaking',
        editable: true,
        removable: true,
        enabled: true, // New custom bands are enabled by default
        name: `Custom Band ${prevBands.filter(b => b.removable).length + 1}`
      }
    ]);
  };

  const handleRemoveEqBand = (idToRemove) => {
    setEqBands(prevBands => prevBands.filter(band => band.id !== idToRemove));
  };

  const handleUpdateEqBand = (idToUpdate, newValues) => {
    setEqBands(prevBands =>
      prevBands.map(band =>
        band.id === idToUpdate ? { ...band, ...newValues } : band
      )
    );
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setAudioDuration(0); // Reset duration on new file
    if (audioRef.current) { // If there's an old audio src, clear it and pause
        audioRef.current.pause();
        audioRef.current.src = '';
    }
    setSelectedFile(file);
    setProcessedAudio(null);
    setOriginalWaveform(null);
    setProcessedWaveform(null);
    // setError(''); // No longer using setError
    if (file) {
      const parts = file.name.split('.');
      const originalNameWithoutExtension = parts.length > 1 ? parts.slice(0, -1).join('.') : parts[0];
      setDownloadFilename(`processed_${originalNameWithoutExtension}.${outputFormat}`);
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
      toast.error('Please select an audio file first.');
      return;
    }

    setIsLoading(true);
    // setError(''); // No longer using setError
    setProcessedAudio(null);
    setOriginalWaveform(null);
    setProcessedWaveform(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('denoise_strength', denoiseStrength);
    formData.append('output_format', outputFormat);
    formData.append('apply_normalization', String(applyNormalization));
    formData.append('request_waveform', String(requestWaveform));

    // Construct EQ bands from the state
    const activeEqBands = eqBands
      .filter(band => band.enabled && (band.gain !== 0 || (band.type === 'lowshelf' && band.gain < 0) || (band.type === 'highshelf' && band.gain < 0)) ) // only include enabled bands that have an effect
      .map(band => ({
        // Ensure we don't send 'enabled', 'id', 'editable', 'removable', 'name' to backend if not needed
        freq: band.freq,
        gain: band.gain,
        q: band.q,
        type: band.type // Pass type to backend
      }));

    if (activeEqBands.length > 0) {
      formData.append('eq_bands_json', JSON.stringify(activeEqBands));
    }

    try {
      const result = await processAudioAPI(formData);

      setProcessedAudio(result.audioUrl);
      setDownloadFilename(result.downloadFilename);

      if (result.isJson && requestWaveform) {
        setOriginalWaveform(result.originalWaveform);
        setProcessedWaveform(result.processedWaveform);
      } else if (!result.isJson) {
        // If we didn't get JSON, it means waveforms weren't returned or requested in a way api.js could parse
        // Reset them if they were previously set
        setOriginalWaveform(null);
        setProcessedWaveform(null);
      }
      // If requestWaveform was true but result.isJson was false, the backend didn't return JSON.
      // The api.js handles the audio part. Here we just ensure waveforms are cleared.
      if (requestWaveform && !result.isJson) {
          console.warn("Waveforms were requested, but the server response was not in the expected JSON format.");
          toast.warn("Waveforms were requested, but the server response was not in the expected JSON format. Audio is processed.");
      }
      toast.success("Audio processed successfully!");

    } catch (err) {
      console.error('Error processing audio:', err);
      // setError(err.message || 'Failed to process audio. Please check the console for more details.'); // Replaced
      toast.error(err.message || 'Failed to process audio. Please check the server logs.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleWaveformSeek = (seekTime) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      audioRef.current.play().catch(error => {
        // Autoplay was prevented, usually by browser policy.
        // You might want to inform the user or handle this gracefully.
        console.warn("Autoplay prevented: ", error);
        toast.info("Playback initiated. If audio doesn't start, press play.");
      });
    }
  };

  return (
    <AppContainer>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <AppHeader>
        <h1>Audio Processing App</h1>
      </AppHeader>
      <MainContent>
        <StyledForm onSubmit={handleSubmit}>
          <TwoColumnFormLayout>
            <div> {/* Column 1 */}
              <FileUpload
                onFileChange={handleFileChange}
                selectedFile={selectedFile}
                isLoading={isLoading}
              />
              {/* Process Audio Button moved to the left column */}
              <Button
                type="submit"
                disabled={isLoading || !selectedFile}
                style={{ marginTop: '20px', width: '100%' }} // Added style for better placement
              >
                {isLoading ? 'Processing...' : 'Process Audio'}
              </Button>
            </div>
            <div> {/* Column 2 */}
              <AudioControls
                denoiseStrength={denoiseStrength}
                onDenoiseStrengthChange={(e) => setDenoiseStrength(parseFloat(e.target.value))}
                outputFormat={outputFormat}
                onOutputFormatChange={(e) => setOutputFormat(e.target.value)}
                supportedFormats={SUPPORTED_OUTPUT_FORMATS}
                // Old EQ props removed
                eqBands={eqBands} // New dynamic EQ prop
                onAddEqBand={handleAddEqBand} // New dynamic EQ prop
                onRemoveEqBand={handleRemoveEqBand} // New dynamic EQ prop
                onUpdateEqBand={handleUpdateEqBand} // New dynamic EQ prop
                applyNormalization={applyNormalization}
                onApplyNormalizationChange={(e) => setApplyNormalization(e.target.checked)}
                requestWaveform={requestWaveform}
                onRequestWaveformChange={(e) => setRequestWaveform(e.target.checked)}
                isLoading={isLoading}
              />
            </div>
          </TwoColumnFormLayout>
        </StyledForm>

        {/* {error && ( // This section is now removed
          <ErrorMessage>
            <p>Error: {error}</p>
          </ErrorMessage>
        )} */}

        {requestWaveform && selectedFile && (
          <WaveformsSection>
            <WaveformDisplay
              data={originalWaveform}
              title="Original Waveform"
              audioDuration={audioDuration}
              // onWaveformClick={handleWaveformSeek} // Or a different handler if original waveform should also seek
            />
            <WaveformDisplay
              data={processedWaveform}
              title="Processed Waveform"
              audioDuration={audioDuration}
              onWaveformClick={handleWaveformSeek}
            />
          </WaveformsSection>
        )}

        <AudioPlayer
          data-testid="audio-player" // Added for testing
          processedAudio={processedAudio}
          downloadFilename={downloadFilename}
          audioRef={audioRef}
          onLoadedMetadata={handleLoadedMetadata}
        />
      </MainContent>
    </AppContainer>
  );
}

export default App;
