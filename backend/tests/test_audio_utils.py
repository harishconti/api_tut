import pytest
import numpy as np
import soundfile as sf
import io
from fastapi import UploadFile
from unittest.mock import MagicMock, patch, AsyncMock

from backend.audio_utils import (
    denoise_audio,
    load_audio_from_uploadfile,
    save_audio_to_bytesio,
    SUPPORTED_AUDIO_FORMATS
)

# Fixtures for dummy audio data
@pytest.fixture
def mono_audio_data():
    data = np.random.randn(16000)  # 1 second of mono audio at 16kHz
    # Normalize and clamp to prevent clipping issues with PCM formats
    max_val = np.max(np.abs(data))
    if max_val > 0: # Avoid division by zero for silent audio
        data = data / max_val * 0.98 # Normalize to slightly less than 1 to avoid edge cases
    return data

@pytest.fixture
def stereo_audio_data():
    data = np.random.randn(16000, 2)  # 1 second of stereo audio at 16kHz
    # Normalize and clamp
    max_val = np.max(np.abs(data))
    if max_val > 0:
        data = data / max_val * 0.98
    return data

@pytest.fixture
def sample_rate():
    return 16000

# Tests for denoise_audio
def test_denoise_audio_various_strengths(mono_audio_data, sample_rate):
    for strength in [0.0, 0.5, 1.0]:
        denoised = denoise_audio(mono_audio_data, sample_rate, strength=strength)
        assert isinstance(denoised, np.ndarray)
        assert denoised.shape == mono_audio_data.shape
        # A very basic check: if strength is applied, output might differ for non-zero input
        if strength > 0.0 and np.any(mono_audio_data):
            # Check that some change occurred if input is not all zeros and strength is applied
            # This is not a perfect test for denoising quality but checks if the function has an effect
            assert not np.allclose(denoised, mono_audio_data, atol=1e-7) or np.sum(np.abs(mono_audio_data - denoised)) > 1e-9


def test_denoise_audio_default_strength(mono_audio_data, sample_rate):
    denoised = denoise_audio(mono_audio_data, sample_rate) # Uses default strength (0.5)
    assert isinstance(denoised, np.ndarray)
    assert denoised.shape == mono_audio_data.shape

# Tests for load_audio_from_uploadfile
@pytest.mark.asyncio
async def test_load_audio_from_uploadfile_wav_mono_async_mock(mono_audio_data, sample_rate):
    buffer = io.BytesIO()
    sf.write(buffer, mono_audio_data, sample_rate, format='wav', subtype='PCM_16') # Specify subtype for consistency
    buffer.seek(0)
    file_content = buffer.read()

    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.wav"
    mock_file.read = AsyncMock(return_value=file_content)

    audio_data, sr, error = await load_audio_from_uploadfile(mock_file)

    assert error is None
    assert sr == sample_rate
    assert isinstance(audio_data, np.ndarray)
    assert audio_data.ndim == 1
    assert np.allclose(audio_data, mono_audio_data, atol=1e-3) # Increased tolerance
    mock_file.read.assert_awaited_once()

@pytest.mark.asyncio
async def test_load_audio_from_uploadfile_wav_stereo_to_mono_async_mock(stereo_audio_data, sample_rate):
    buffer = io.BytesIO()
    sf.write(buffer, stereo_audio_data, sample_rate, format='wav', subtype='PCM_16')
    buffer.seek(0)
    file_content = buffer.read()

    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test_stereo.wav"
    mock_file.read = AsyncMock(return_value=file_content)

    audio_data, sr, error = await load_audio_from_uploadfile(mock_file)

    assert error is None
    assert sr == sample_rate
    assert isinstance(audio_data, np.ndarray)
    assert audio_data.ndim == 1
    assert len(audio_data) == stereo_audio_data.shape[0]
    mock_file.read.assert_awaited_once()

@pytest.mark.asyncio
async def test_load_audio_from_uploadfile_unsupported_format():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "test.txt"

    audio_data, sr, error = await load_audio_from_uploadfile(mock_file)

    assert audio_data is None
    assert sr is None
    assert "Unsupported audio format: txt" in error

@pytest.mark.asyncio
async def test_load_audio_from_uploadfile_no_filename():
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = None

    audio_data, sr, error = await load_audio_from_uploadfile(mock_file)

    assert audio_data is None
    assert sr is None
    assert "File has no name" in error

@pytest.mark.asyncio
@patch('backend.audio_utils.sf.read', side_effect=Exception("Mocked sf.read error"))
async def test_load_audio_from_uploadfile_sf_read_exception_async_mock(mock_sf_read_custom):
    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = "error.wav"
    mock_file.read = AsyncMock(return_value=b"dummy data")

    audio_data, sr, error = await load_audio_from_uploadfile(mock_file)

    assert audio_data is None
    assert sr is None
    assert "Error loading audio file: Mocked sf.read error" in error
    mock_file.read.assert_awaited_once()
    mock_sf_read_custom.assert_called_once()

# Tests for save_audio_to_bytesio
@pytest.mark.parametrize("fmt", ["wav", "flac"])
def test_save_audio_to_bytesio_supported_formats(mono_audio_data, sample_rate, fmt):
    buffer = save_audio_to_bytesio(mono_audio_data, sample_rate, format=fmt)
    assert isinstance(buffer, io.BytesIO)
    assert len(buffer.getvalue()) > 0

    buffer.seek(0)
    data_read, sr_read = sf.read(buffer, dtype='float32')
    assert sr_read == sample_rate
    assert np.allclose(data_read, mono_audio_data, atol=1e-3) # Increased tolerance

def test_supported_audio_formats_variable():
    assert "wav" in SUPPORTED_AUDIO_FORMATS
    assert "mp3" in SUPPORTED_AUDIO_FORMATS
    assert "flac" in SUPPORTED_AUDIO_FORMATS

# --- Tests for new audio_utils functions ---
from backend.audio_utils import apply_equalizer, normalize_audio_loudness, generate_waveform_data

def test_apply_equalizer_no_bands(mono_audio_data, sample_rate):
    eq_bands = []
    equalized_audio = apply_equalizer(mono_audio_data, sample_rate, eq_bands)
    assert isinstance(equalized_audio, np.ndarray)
    assert equalized_audio.shape == mono_audio_data.shape
    # With no bands, output should be very close to input (allowing for float conversions)
    assert np.allclose(equalized_audio, mono_audio_data, atol=1e-2) # Increased tolerance for pydub int16 conversion

def test_apply_equalizer_single_band_boost(mono_audio_data, sample_rate):
    eq_bands = [{"freq": 1000, "gain": 6, "q": 1.0}]
    equalized_audio = apply_equalizer(mono_audio_data, sample_rate, eq_bands)
    assert isinstance(equalized_audio, np.ndarray)
    assert equalized_audio.shape == mono_audio_data.shape
    # Basic check: output should differ from input if gain is applied and audio is not silent
    if np.any(mono_audio_data):
        assert not np.allclose(equalized_audio, mono_audio_data, atol=1e-3)

def test_apply_equalizer_multiple_bands(stereo_audio_data, sample_rate):
    eq_bands = [
        {"freq": 100, "gain": -3, "q": 0.7},
        {"freq": 1000, "gain": 3, "q": 1.4},
        {"freq": 5000, "gain": -2, "q": 2.0}
    ]
    # Determine original number of channels from fixture
    original_channels = stereo_audio_data.shape[1] if stereo_audio_data.ndim > 1 else 1

    equalized_audio = apply_equalizer(stereo_audio_data, sample_rate, eq_bands, channels=original_channels)
    assert isinstance(equalized_audio, np.ndarray)
    assert equalized_audio.shape == stereo_audio_data.shape # Shape should be preserved
    if np.any(stereo_audio_data):
         assert not np.allclose(equalized_audio, stereo_audio_data, atol=1e-3)


def test_apply_equalizer_stereo_input(stereo_audio_data, sample_rate):
    eq_bands = [{"freq": 1000, "gain": 3, "q": 1.0}]
    original_channels = stereo_audio_data.shape[1]
    equalized_audio = apply_equalizer(stereo_audio_data, sample_rate, eq_bands, channels=original_channels)
    assert isinstance(equalized_audio, np.ndarray)
    assert equalized_audio.ndim == 2
    assert equalized_audio.shape == stereo_audio_data.shape

# Tests for normalize_audio_loudness
def test_normalize_audio_loudness_mono(mono_audio_data, sample_rate):
    # Ensure data is float for pyloudnorm
    data = mono_audio_data.astype(np.float32)
    if np.max(np.abs(data)) == 0: # Handle silent audio case
        data[0] = 0.01 # Add a tiny bit of signal to avoid issues with all-zero input for pyloudnorm

    normalized_audio = normalize_audio_loudness(data, sample_rate, target_lufs=-23.0)
    assert isinstance(normalized_audio, np.ndarray)
    assert normalized_audio.shape == data.shape
    # Further checks could involve measuring LUFS, but that's complex for a unit test.
    # Check that the audio is not drastically scaled to zero or infinity if input is not silent.
    if np.any(data):
        assert np.max(np.abs(normalized_audio)) > 1e-6 # Not completely silent
        assert np.max(np.abs(normalized_audio)) < 10.0  # Not excessively loud (pyloudnorm can increase gain significantly)


def test_normalize_audio_loudness_stereo(stereo_audio_data, sample_rate): # Reverted to use full fixture
    data = stereo_audio_data.astype(np.float32)
    if np.max(np.abs(data)) == 0:
        # This should ideally not happen with random data, but good practice
        data[0,0] = 0.01 # Ensure not silent

    normalized_audio = normalize_audio_loudness(data, sample_rate, target_lufs=-23.0)
    assert isinstance(normalized_audio, np.ndarray)
    assert normalized_audio.shape == data.shape # Shape should be preserved
    assert normalized_audio.ndim == 2
    if np.any(data):
        assert np.max(np.abs(normalized_audio)) > 1e-6 # Check it's not all zero
        assert np.max(np.abs(normalized_audio)) < 10.0


# Tests for generate_waveform_data
def test_generate_waveform_data_mono(mono_audio_data, sample_rate):
    points = 100
    waveform = generate_waveform_data(mono_audio_data, sample_rate, points=points)
    assert isinstance(waveform, list)
    assert len(waveform) == points
    assert all(0.0 <= val <= 1.0 for val in waveform)

def test_generate_waveform_data_stereo(stereo_audio_data, sample_rate):
    points = 150
    waveform = generate_waveform_data(stereo_audio_data, sample_rate, points=points)
    assert isinstance(waveform, list)
    assert len(waveform) == points
    assert all(0.0 <= val <= 1.0 for val in waveform)

def test_generate_waveform_data_silent_audio(sample_rate):
    silent_audio = np.zeros(sample_rate) # 1 second of silence
    points = 50
    waveform = generate_waveform_data(silent_audio, sample_rate, points=points)
    assert isinstance(waveform, list)
    assert len(waveform) == points
    assert all(val == 0.0 for val in waveform)

def test_generate_waveform_data_sine_wave(sample_rate):
    frequency = 5  # Hz (low frequency to see peaks in short waveform)
    duration = 1  # second
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    sine_audio = 0.5 * np.sin(2 * np.pi * frequency * t)
    points = 200
    waveform = generate_waveform_data(sine_audio, sample_rate, points=points)
    assert isinstance(waveform, list)
    assert len(waveform) == points
    assert all(0.0 <= val <= 1.0 for val in waveform)
    # Check if there are some peaks and troughs (not all zero if sine_audio is not flat)
    if np.any(sine_audio):
        assert any(val > 0.0 for val in waveform)
    # Max value should be around 0.5 (normalized from input 0.5 sine wave) if points are enough
    # This can be tricky due to downsampling, but max should be close to 1.0 after normalization within generate_waveform_data
    if np.max(sine_audio) > 0:
         assert any(val > 0.8 for val in waveform) # Expect some high values after normalization
