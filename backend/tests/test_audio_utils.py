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
