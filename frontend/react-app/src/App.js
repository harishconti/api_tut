import React, { useState, useEffect, useRef } from 'react'; // Import useRef
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import FileUpload from './components/FileUpload';
import AudioControls from './components/AudioControls';
import SettingsCard from './components/SettingsCard';
import CompressorControls from './components/CompressorControls';
import ReverbControls from './components/ReverbControls'; // Import ReverbControls
import AudioPlayer from './components/AudioPlayer';
import WaveformDisplay from './components/WaveformDisplay';
import { processAudio as processAudioAPI } from './api';
import {
  AppContainer,
  AppHeader,
  MainContent,
  StyledForm,
  // TwoColumnFormLayout, // No longer used directly here, layout handled by MainAppLayout
  // ErrorMessage, // Replaced by toast
  // WaveformsSection, // Will be replaced by ResultsSection and WaveformsDisplayLayout
  Button,
  MainAppLayout,
  LeftColumn,
  RightColumn,
  ResultsSection,
  WaveformsDisplayLayout,
  EffectsToolsSection,
  EffectToggleButton,
  EffectButtonRow, // Added
  FormGroup
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

  // States for new effects visibility
  const [showEQ, setShowEQ] = useState(false);
  const [showCompressor, setShowCompressor] = useState(false);
  const [showReverb, setShowReverb] = useState(false);

  // State for Silence Trimming
  const [trimSilence, setTrimSilence] = useState(false);

  // States for Compressor settings
  const [compressorThreshold, setCompressorThreshold] = useState(-20); // dB
  const [compressorRatio, setCompressorRatio] = useState(4); // ratio:1
  const [compressorAttack, setCompressorAttack] = useState(5); // ms
  const [compressorRelease, setCompressorRelease] = useState(50); // ms

  // States for Reverb settings
  const [reverbRoomSize, setReverbRoomSize] = useState(0.5); // 0-1
  const [reverbWetDryMix, setReverbWetDryMix] = useState(0.3); // 0-1

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
    formData.append('trim_silence', String(trimSilence));

    // Construct EQ bands from the state if EQ is shown and active bands exist
    if (showEQ) {
      const activeEqBands = eqBands
        .filter(band => band.enabled && (band.gain !== 0 || (band.type === 'lowshelf' && band.gain < 0) || (band.type === 'highshelf' && band.gain < 0)) )
        .map(band => ({
          freq: band.freq,
          gain: band.gain,
          q: band.q,
          type: band.type
        }));
      if (activeEqBands.length > 0) {
        formData.append('eq_bands_json', JSON.stringify(activeEqBands));
      }
    }

    // Add Compressor settings if Compressor is shown
    if (showCompressor) {
      formData.append('compressor_threshold', compressorThreshold);
      formData.append('compressor_ratio', compressorRatio);
      formData.append('compressor_attack', compressorAttack);
      formData.append('compressor_release', compressorRelease);
    }

    // Add Reverb settings if Reverb is shown
    if (showReverb) {
      formData.append('reverb_room_size', reverbRoomSize);
      formData.append('reverb_wet_dry_mix', reverbWetDryMix);
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
          <MainAppLayout>
            <LeftColumn>
              <FileUpload
                onFileChange={handleFileChange}
                selectedFile={selectedFile}
                isLoading={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !selectedFile}
                style={{ width: '100%' }} // Ensure button takes full width of left column
              >
                {isLoading ? 'Processing...' : 'Process Audio'}
              </Button>
              <SettingsCard
                denoiseStrength={denoiseStrength}
                onDenoiseStrengthChange={(e) => setDenoiseStrength(parseFloat(e.target.value))}
                outputFormat={outputFormat}
                onOutputFormatChange={(e) => setOutputFormat(e.target.value)}
                supportedFormats={SUPPORTED_OUTPUT_FORMATS}
                applyNormalization={applyNormalization}
                onApplyNormalizationChange={(e) => setApplyNormalization(e.target.checked)}
                requestWaveform={requestWaveform}
                onRequestWaveformChange={(e) => setRequestWaveform(e.target.checked)}
                isLoading={isLoading}
              />
              <EffectsToolsSection>
                <h3>Effects & Tools</h3>
                <EffectButtonRow>
                  <EffectToggleButton
                    type="button"
                    active={showEQ}
                    onClick={() => setShowEQ(!showEQ)}
                    disabled={isLoading}
                  >
                    Dynamic Equalizer
                  </EffectToggleButton>
                  <EffectToggleButton
                    type="button"
                    active={showCompressor}
                    onClick={() => setShowCompressor(!showCompressor)}
                    disabled={isLoading}
                  >
                    Compressor
                  </EffectToggleButton>
                  <EffectToggleButton
                    type="button"
                    active={showReverb}
                    onClick={() => setShowReverb(!showReverb)}
                    disabled={isLoading}
                  >
                    Reverb
                  </EffectToggleButton>
                </EffectButtonRow>
                <FormGroup style={{ marginTop: '20px' }}> {/* Using FormGroup for consistent styling of checkbox label */}
                  <label htmlFor="trimSilence">
                    <input
                      type="checkbox"
                      id="trimSilence"
                      checked={trimSilence}
                      onChange={(e) => setTrimSilence(e.target.checked)}
                      disabled={isLoading}
                    />
                    Automatically Trim Silence
                  </label>
                </FormGroup>
              </EffectsToolsSection>
            </LeftColumn>
            <RightColumn>
              {/* EQ, Compressor, Reverb controls will be conditionally rendered here */}
              {showEQ && (
                <AudioControls
                  eqBands={eqBands}
                  onAddEqBand={handleAddEqBand}
                  onRemoveEqBand={handleRemoveEqBand}
                  onUpdateEqBand={handleUpdateEqBand}
                  isLoading={isLoading}
                />
              )}
              {showCompressor && (
                <CompressorControls
                  threshold={compressorThreshold}
                  onThresholdChange={(e) => setCompressorThreshold(parseFloat(e.target.value))}
                  ratio={compressorRatio}
                  onRatioChange={(e) => setCompressorRatio(parseFloat(e.target.value))}
                  attack={compressorAttack}
                  onAttackChange={(e) => setCompressorAttack(parseFloat(e.target.value))}
                  release={compressorRelease}
                  onReleaseChange={(e) => setCompressorRelease(parseFloat(e.target.value))}
                  isLoading={isLoading}
                />
              )}
              {showReverb && (
                <ReverbControls
                  roomSize={reverbRoomSize}
                  onRoomSizeChange={(e) => setReverbRoomSize(parseFloat(e.target.value))}
                  wetDryMix={reverbWetDryMix}
                  onWetDryMixChange={(e) => setReverbWetDryMix(parseFloat(e.target.value))}
                  isLoading={isLoading}
                />
              )}
            </RightColumn>
          </MainAppLayout>
        </StyledForm>

        {processedAudio && (
          <ResultsSection>
            <h2>Results</h2>
            {requestWaveform && selectedFile && (
              <WaveformsDisplayLayout>
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
              </WaveformsDisplayLayout>
            )}
            <AudioPlayer
              data-testid="audio-player"
              processedAudio={processedAudio}
              downloadFilename={downloadFilename}
              audioRef={audioRef}
              onLoadedMetadata={handleLoadedMetadata}
            />
          </ResultsSection>
        )}
      </MainContent>
    </AppContainer>
  );
}

export default App;
