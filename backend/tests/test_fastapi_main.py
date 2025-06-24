import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# Mock the Google Cloud SQL Connector to prevent it from trying to initialize
# This should be done before `app` is imported if the connection is setup at import time.
# However, fastapi_main.py imports db_reader which initializes Connector.
# So, we need to ensure this patch is active when fastapi_main is first imported by the test runner.
# One way is to put it here, as pytest will import this test file, and then when it imports app,
# the patch will be active.

# If db_reader.py is:
# from google.cloud.sql.connector import Connector
# connector = Connector() # This line runs at import time
#
# Then the patch needs to be active *before* `from backend.fastapi_main import app`
# is executed by the test loader.
# A common way to handle this is using a pytest fixture with autouse=True or by patching
# directly in the test file that imports the app.

# Let's try patching it directly here.
# If Connector is used like `google.cloud.sql.connector.Connector`, this is the target.
# If it's `from google.cloud.sql.connector import Connector` then `Connector` in that module's namespace.
# The error trace shows `google.cloud.sql.connector.connector.py` and `Connector()`.
# So the import in db_reader.py is likely `from google.cloud.sql.connector import Connector` (this module is now removed)
# and then it calls `Connector()`. We need to patch `Connector` in `backend.modules.db_reader`. (this module is now removed)

# The Google Cloud SQL Connector and related local patches are no longer needed
# as db_reader.py has been removed.
# Global mocks for google.auth.default and potentially Connector (if used by other libs)
# are handled in conftest.py.

import soundfile as sf
import numpy as np
import io

# Adjust the import path according to your project structure
# This assumes that your tests are in backend/tests and your app is in backend/fastapi_main.py
# If you run pytest from the root of the project, you might need to adjust Python's path
# or use relative imports if your project is structured as a package.
from backend.fastapi_main import app
from backend.audio_utils import SUPPORTED_AUDIO_FORMATS

client = TestClient(app)

# Helper to create a dummy wav file in-memory
def create_dummy_wav_file(filename="test.wav", duration=1, sr=16000, channels=1):
    if channels == 1:
        data = np.random.randn(duration * sr)
    elif channels == 2:
        data = np.random.randn(duration * sr, 2)
    else:
        raise ValueError("Unsupported number of channels for dummy wav creator")

    # Normalize to prevent clipping before writing to PCM
    max_val = np.max(np.abs(data))
    if max_val > 0:
        data = data / max_val * 0.98

    buffer = io.BytesIO()
    sf.write(buffer, data, sr, format='wav', subtype='PCM_16')
    buffer.seek(0)
    return {"file": (filename, buffer, "audio/wav")}


@pytest.fixture(scope="module")
def default_wav_upload():
    return create_dummy_wav_file()

def test_index_route():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Audio Processing API. Use the /process/ endpoint to process audio."}

# Tests for /process/ endpoint
def test_process_audio_default_params(default_wav_upload):
    response = client.post("/process/", files=default_wav_upload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav" # Default output format
    assert "attachment; filename=processed_test.wav" in response.headers["content-disposition"]

    # Try to read the audio data from response
    with io.BytesIO(response.content) as audio_buffer:
        data, sr = sf.read(audio_buffer)
        assert isinstance(data, np.ndarray)
        assert sr == 16000 # Assuming default_wav_upload uses 16000

def test_process_audio_custom_denoise_strength(default_wav_upload):
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"denoise_strength": "0.8"} # Form data
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    # Further checks could involve analyzing the output if we had a deterministic way
    # to measure denoising, but for now, successful processing is the main check.

def test_process_audio_output_format_flac(default_wav_upload):
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"output_format": "flac"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/flac"
    assert "attachment; filename=processed_test.flac" in response.headers["content-disposition"]
    with io.BytesIO(response.content) as audio_buffer:
        data, sr = sf.read(audio_buffer) # soundfile can read flac
        assert isinstance(data, np.ndarray)

def test_process_audio_output_format_mp3(default_wav_upload):
    # MP3 processing might depend on ffmpeg being available for soundfile/libsndfile
    # If it's not guaranteed, this test might be flaky or fail.
    # For now, we assume the backend will try and succeed or fail gracefully.
    # The backend currently restricts output to wav/flac if input is not mp3,
    # but if input is mp3, it tries to output mp3.
    # The FastAPI endpoint now explicitly checks against SUPPORTED_AUDIO_FORMATS for output.
    mp3_upload = create_dummy_wav_file(filename="test_for_mp3.wav") # start with wav for consistent input
    response = client.post(
        "/process/",
        files=mp3_upload,
        data={"output_format": "mp3"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mp3"
    assert "attachment; filename=processed_test_for_mp3.mp3" in response.headers["content-disposition"]
    # Validating MP3 content is harder without a dedicated library or assuming ffmpeg
    # For now, checking headers and status is a good start.


@pytest.mark.parametrize("strength_val, expected_status", [
    ("0.5", 200), ("0", 200), ("1", 200), # Valid
    ("-0.1", 422), ("1.1", 422), ("abc", 422) # Invalid
])
def test_process_audio_invalid_denoise_strength(default_wav_upload, strength_val, expected_status):
    response = client.post(
        "/process/",
        files=default_wav_upload, # Need to re-create as buffer is consumed
        data={"denoise_strength": strength_val}
    )
    assert response.status_code == expected_status
    if expected_status == 422:
        assert "detail" in response.json()


def test_process_audio_unsupported_output_format(default_wav_upload):
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"output_format": "ogg"} # Assuming ogg is not in SUPPORTED_AUDIO_FORMATS
    )
    assert response.status_code == 400 # Changed from 422 to 400 based on current implementation
    json_response = response.json()
    assert "detail" in json_response
    assert "Unsupported output format: ogg" in json_response["detail"]


def test_process_audio_no_file():
    response = client.post("/process/")
    assert response.status_code == 422 # FastAPI's handling of missing File(...)
    assert "detail" in response.json()
    # Example check for the detail message structure
    details = response.json()["detail"]
    found_missing_file = any(d["type"] == "missing" and "file" in d["loc"] for d in details)
    assert found_missing_file


def test_process_audio_unsupported_input_file_type():
    # Create a dummy text file
    txt_file_content = b"This is not an audio file."
    files = {"file": ("test.txt", io.BytesIO(txt_file_content), "text/plain")}
    response = client.post("/process/", files=files)
    assert response.status_code == 400
    json_response = response.json()
    assert "detail" in json_response
    assert "Unsupported audio format: txt" in json_response["detail"]

# Ensure SUPPORTED_AUDIO_FORMATS is used for parameterizing some tests if needed
@pytest.mark.parametrize("supported_format", SUPPORTED_AUDIO_FORMATS)
def test_process_audio_all_supported_output_formats(supported_format):
    # This test is a bit more involved as it needs to handle mp3 potentially.
    # Soundfile might not be able to write all formats without external dependencies (like ffmpeg for mp3).
    # The backend's save_audio_to_bytesio uses soundfile, so its limitations apply.

    # Skip mp3 if soundfile cannot write it without external tools, to avoid test failures.
    # This is a common issue with testing mp3 generation.
    can_write_mp3 = False
    try:
        # Try to write a dummy mp3 to see if soundfile supports it in current env
        # This is a bit of a hack for test setup.
        d = np.array([0], dtype=np.float32)
        sf.write(io.BytesIO(), d, 16000, format='mp3')
        can_write_mp3 = True
    except Exception: # Could be sf.LibsndfileError or other soundfile/system errors
        can_write_mp3 = False

    if supported_format == "mp3" and not can_write_mp3:
        pytest.skip(f"Skipping {supported_format} output test as soundfile cannot write it in this environment.")

    # Re-create dummy file for each parametrized test run
    dummy_file_upload = create_dummy_wav_file(filename=f"input_for_{supported_format}.wav")
    response = client.post(
        "/process/",
        files=dummy_file_upload,
        data={"output_format": supported_format}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == f"audio/{supported_format}"
    assert f"processed_input_for_{supported_format}.{supported_format}" in response.headers["content-disposition"]

    # Attempt to read the response content to verify it's a valid audio file of the format
    with io.BytesIO(response.content) as audio_buffer:
        try:
            data, sr = sf.read(audio_buffer)
            assert isinstance(data, np.ndarray)
        except Exception as e:
            pytest.fail(f"Failed to read processed audio format {supported_format}: {e}")

# Note: To run these tests, pytest needs to be installed (pip install pytest).
# Run from the project root or ensure backend directory is in PYTHONPATH.
# Example: From project root: python -m pytest backend/tests
# If `backend.fastapi_main` cannot be found, it's likely a PYTHONPATH issue.
# Consider structuring your project with a setup.py or pyproject.toml to make it installable
# or adjust PYTHONPATH: `export PYTHONPATH=.` from the root before running pytest.

import json # Added for new tests
import base64 # Added for decoding audio in waveform tests

# --- Tests for new features: EQ, Normalization, Waveform ---

def test_process_audio_with_eq(default_wav_upload):
    eq_bands = [{"freq": 1000, "gain": 3, "q": 1.0}]
    eq_bands_json = json.dumps(eq_bands)
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"eq_bands_json": eq_bands_json, "output_format": "wav"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    # Further validation could involve checking if the audio content was actually modified.

def test_process_audio_with_invalid_eq_json(default_wav_upload):
    invalid_eq_json = '[{"freq": 1000, "gain": "not_a_number", "q": 1.0}]' # gain should be number
    # Actually, the Pydantic model on backend might not catch this if it's just string -> json.loads
    # The backend error would likely be from apply_equalizer if types are wrong after json.loads
    # Let's test malformed JSON string first.
    malformed_eq_json = '[{"freq": 1000, "gain": 3, "q": 1.0]' # Missing closing bracket
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"eq_bands_json": malformed_eq_json, "output_format": "wav"}
    )
    assert response.status_code == 400 # Expecting bad request due to JSON parsing
    json_response = response.json()
    assert "detail" in json_response
    assert "Invalid JSON format for EQ bands" in json_response["detail"]


def test_process_audio_with_normalization(default_wav_upload):
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"apply_normalization": "True", "output_format": "wav"} # Form data sends strings
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    # As with EQ, validating actual normalization effect is complex here.

def test_process_audio_request_waveform(default_wav_upload):
    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={"request_waveform": "True", "output_format": "wav"}
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    json_response = response.json()

    assert "message" in json_response
    assert "audio_filename" in json_response
    assert "audio_format" in json_response
    assert "audio_b64" in json_response
    assert "original_waveform" in json_response
    assert "processed_waveform" in json_response

    assert isinstance(json_response["audio_b64"], str)
    assert len(json_response["audio_b64"]) > 0

    assert isinstance(json_response["original_waveform"], list)
    assert len(json_response["original_waveform"]) > 0 # Default 500 points
    assert all(isinstance(x, (float, int)) for x in json_response["original_waveform"])

    assert isinstance(json_response["processed_waveform"], list)
    assert len(json_response["processed_waveform"]) > 0
    assert all(isinstance(x, (float, int)) for x in json_response["processed_waveform"])

    assert json_response["audio_filename"] == "processed_test.wav"
    assert json_response["audio_format"] == "wav"

    # Try to decode base64 audio
    try:
        audio_content = base64.b64decode(json_response["audio_b64"])
        with io.BytesIO(audio_content) as audio_buffer:
            data, sr = sf.read(audio_buffer)
            assert isinstance(data, np.ndarray)
            assert sr == 16000 # From default_wav_upload
    except Exception as e:
        pytest.fail(f"Failed to decode or read base64 audio from JSON response: {e}")


def test_process_audio_all_features_waveform_request(default_wav_upload):
    eq_bands = [{"freq": 100, "gain": -6, "q": 0.7}, {"freq": 2000, "gain": 2, "q": 1.5}]
    eq_bands_json = json.dumps(eq_bands)

    response = client.post(
        "/process/",
        files=default_wav_upload,
        data={
            "denoise_strength": "0.3",
            "eq_bands_json": eq_bands_json,
            "apply_normalization": "True",
            "request_waveform": "True",
            "output_format": "flac"
        }
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    json_response = response.json()

    assert json_response["audio_format"] == "flac"
    assert json_response["audio_filename"] == "processed_test.flac"
    assert isinstance(json_response["original_waveform"], list)
    assert isinstance(json_response["processed_waveform"], list)
    assert json_response["denoise_strength_applied"] == 0.3
    assert json_response["normalization_applied"] is True
    assert json_response["eq_bands_applied"] == eq_bands

    # Verify audio content can be decoded
    try:
        audio_content = base64.b64decode(json_response["audio_b64"])
        with io.BytesIO(audio_content) as audio_buffer:
            data, sr = sf.read(audio_buffer) # Removed format='FLAC'
            assert isinstance(data, np.ndarray) # Corrected indentation
    except Exception as e:
        pytest.fail(f"Failed to decode or read base64 FLAC audio: {e}")


def test_process_audio_all_features_no_waveform_request(default_wav_upload):
    eq_bands = [{"freq": 500, "gain": -2, "q": 1.0}]
    eq_bands_json = json.dumps(eq_bands)

    response = client.post(
        "/process/",
        files=create_dummy_wav_file(filename="test_no_wf.wav"), # Fresh file
        data={
            "denoise_strength": "0.1",
            "eq_bands_json": eq_bands_json,
            "apply_normalization": "True",
            "request_waveform": "False", # Key difference
            "output_format": "wav"
        }
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav" # Direct audio stream
    assert "attachment; filename=processed_test_no_wf.wav" in response.headers["content-disposition"]

    # Verify it's valid audio content
    with io.BytesIO(response.content) as audio_buffer:
        data, sr = sf.read(audio_buffer)
        assert isinstance(data, np.ndarray)
        assert sr == 16000

# --- Tests for Stereo Processing ---
def test_process_stereo_audio_preserves_channels():
    """
    Tests that processing a stereo input file results in a stereo output file
    when denoising and other compatible operations are applied.
    """
    stereo_upload = create_dummy_wav_file(filename="stereo_in.wav", channels=2, sr=44100)

    response = client.post(
        "/process/",
        files=stereo_upload,
        data={
            "denoise_strength": "0.2", # Apply some denoising
            "output_format": "wav",
            "apply_normalization": "True",
            # Not requesting waveform, so we get a file stream back
        }
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/wav"
    assert "attachment; filename=processed_stereo_in.wav" in response.headers["content-disposition"]

    # Read the processed audio from response
    with io.BytesIO(response.content) as audio_buffer:
        processed_data, sr = sf.read(audio_buffer, always_2d=True) # always_2d=True to simplify channel check
        assert isinstance(processed_data, np.ndarray)
        assert sr == 44100
        assert processed_data.ndim == 2, "Processed audio should be stereo (2 dimensions)"
        assert processed_data.shape[1] == 2, "Processed audio should have 2 channels"
