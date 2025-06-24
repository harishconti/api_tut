import librosa
import noisereduce as nr
import soundfile as sf
import numpy as np
from fastapi import UploadFile
import io
from pydub import AudioSegment
from pydub.scipy_effects import eq as pydub_eq # Changed from pydub.effects
import pyloudnorm as pyln
from typing import List, Dict, Any

SUPPORTED_AUDIO_FORMATS = ["wav", "mp3", "flac"]

def denoise_audio(audio_data: np.ndarray, sample_rate: int, strength: float = 0.5) -> np.ndarray: # Default strength added
    """
    Denoises an audio signal using spectral gating.
    If input is stereo, it's converted to mono for denoising, and the result
    is duplicated to match original stereo channel count.

    Args:
        audio_data (np.ndarray): The input audio signal (mono or stereo).
        sample_rate (int): The sample rate of the audio signal.
        strength (float): Denoising strength (0.0 to 1.0).

    Returns:
        np.ndarray: The denoised audio signal, with original channel count preserved.
    """
    original_channels = 1
    mono_audio_data = audio_data
    was_stereo = False

    if audio_data.ndim == 2:
        original_channels = audio_data.shape[1]
        if original_channels > 1 : # Covers stereo and multi-channel more broadly
            was_stereo = True
            # Convert to mono for noisereduce. Transpose if shape is (channels, samples)
            # Soundfile gives (samples, channels), so audio_data.T is (channels, samples) for librosa
            mono_audio_data = librosa.to_mono(audio_data.T)
        elif original_channels == 1: # Case where audio_data is (samples, 1)
             mono_audio_data = audio_data.reshape(-1) # Flatten to 1D for noisereduce

    # Noisereduce expects 1D or 2D array (y or y_multichannel)
    # For simplicity and as per plan, we use the 1D mono version.
    denoised_mono = nr.reduce_noise(y=mono_audio_data, sr=sample_rate, prop_decrease=strength)

    if was_stereo and original_channels > 1:
        # Duplicate the denoised mono channel to restore the original channel count
        # np.tile can work, or np.column_stack for 2 channels
        if original_channels == 2: # Common stereo case
            denoised_stereo = np.column_stack((denoised_mono, denoised_mono))
        else: # For >2 channels, repeat the mono track for each channel
            denoised_stereo = np.tile(denoised_mono, (original_channels, 1)).T
        return denoised_stereo
    else:
        return denoised_mono

async def load_audio_from_uploadfile(file: UploadFile) -> tuple[np.ndarray | None, int | None, str | None]:
    """
    Loads audio data from an UploadFile object.

    Args:
        file (UploadFile): The uploaded audio file.

    Returns:
        tuple[np.ndarray | None, int | None, str | None]: A tuple containing:
            - audio_data (np.ndarray): The audio data as a NumPy array, or None if loading fails.
            - sample_rate (int): The sample rate of the audio, or None if loading fails.
            - error (str): An error message if loading fails, otherwise None.
    """
    if not file.filename:
        return None, None, "File has no name."

    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in SUPPORTED_AUDIO_FORMATS:
        return None, None, f"Unsupported audio format: {file_extension}. Supported formats are: {', '.join(SUPPORTED_AUDIO_FORMATS)}"

    try:
        contents = await file.read()
        # Load audio data, preserving original channel layout
        # sf.read by default returns data as (frames, channels) for multi-channel files.
        audio_data, sample_rate = sf.read(io.BytesIO(contents), always_2d=False)
        # always_2d=False ensures mono files are loaded as 1D arrays, stereo as 2D (samples, channels)
        # No explicit mono conversion here. Downstream functions will handle.
        return audio_data, sample_rate, None
    except Exception as e:
        return None, None, f"Error loading audio file: {str(e)}"

def save_audio_to_bytesio(audio_data: np.ndarray, sample_rate: int, format: str = "wav") -> io.BytesIO:
    """
    Saves denoised audio data to a BytesIO object.

    Args:
        audio_data (np.ndarray): The denoised audio data.
        sample_rate (int): The sample rate of the audio.
        format (str): The desired output audio format (default is "wav").

    Returns:
        io.BytesIO: A BytesIO object containing the audio data.
    """
    buffer = io.BytesIO()
    sf.write(buffer, audio_data, sample_rate, format=format)
    buffer.seek(0)
    return buffer

# --- New functions for Equalizer, Normalization, and Waveform ---

def apply_equalizer(audio_data: np.ndarray, sample_rate: int, eq_bands: List[Dict[str, Any]], channels: int = 1) -> np.ndarray:
    """
    Applies equalization to audio data.

    Args:
        audio_data (np.ndarray): Input audio data. Must be mono or stereo.
        sample_rate (int): Sample rate of the audio.
        eq_bands (List[Dict[str, Any]]): List of equalizer band settings.
            Each dict: {"freq": center_freq_hz, "gain": gain_db, "q": q_factor}
        channels (int): Number of audio channels (1 for mono, 2 for stereo).

    Returns:
        np.ndarray: Equalized audio data.
    """
    # Determine channels from audio_data shape
    if audio_data.ndim == 1:
        current_channels = 1
    elif audio_data.ndim == 2:
        current_channels = audio_data.shape[1]
        if current_channels == 0: # Should not happen with valid audio
             raise ValueError("Audio data has zero channels.")
        # If audio_data is (samples, 1), treat as mono
        if current_channels == 1:
            audio_data = audio_data.reshape(-1) # Ensure it's 1D for pydub mono
            current_channels = 1
    else:
        raise ValueError(f"Unsupported audio data dimensions: {audio_data.ndim}")

    # The 'channels' parameter passed to the function can be a hint,
    # but audio_data's shape is the ground truth at this point.
    # For pydub, we use current_channels derived from audio_data.

    # Convert numpy array to AudioSegment
    # Ensure data is in int16 format for pydub if it's float
    if audio_data.dtype == np.float32 or audio_data.dtype == np.float64:
        audio_data_int = (audio_data * 32767).astype(np.int16)
    else:
        audio_data_int = audio_data.astype(np.int16)

    # pydub expects raw audio data as bytes
    # For stereo, AudioSegment expects interleaved samples if from_mono_audiosegments is not used
    # If data is (samples, channels), then audio_data_int.tobytes() should be fine.

    try:
        sound = AudioSegment(
            data=audio_data_int.tobytes(),
            sample_width=audio_data_int.dtype.itemsize,
            frame_rate=sample_rate,
            channels=current_channels
        )
    except Exception as e:
        # Fallback to mono if stereo conversion fails.
        # This might happen if input was stereo (current_channels=2) but data was malformed for pydub.
        if current_channels == 2:
            # Log warning or error here if possible
            # print(f"Warning: Failed to create stereo AudioSegment, falling back to mono. Error: {e}")
            mono_audio_data_fallback = audio_data # Use the original audio_data before int conversion for librosa
            if mono_audio_data_fallback.ndim == 2 : # If it was stereo (samples, 2)
                 mono_audio_data_fallback = librosa.to_mono(mono_audio_data_fallback.T) # Transpose for librosa

            if mono_audio_data_fallback.dtype == np.float32 or mono_audio_data_fallback.dtype == np.float64:
                mono_data_int = (mono_audio_data_fallback * 32767).astype(np.int16)
            else: # If it was already int somehow, or other type
                mono_data_int = mono_audio_data_fallback.astype(np.int16)

            sound = AudioSegment(
                data=mono_data_int.tobytes(),
                sample_width=mono_data_int.dtype.itemsize,
                frame_rate=sample_rate,
                channels=1 # Forcing mono
            )
            current_channels = 1 # Update current_channels to reflect the change
        else:
            raise e # Re-raise if it wasn't a stereo issue or already mono

    # Apply EQ bands
    # pydub's eq is a filter instance. You apply it by passing the AudioSegment to it.
    # The filter parameters are (-)-center_freq, Q, gain_db.
    # This is not how pydub.effects.eq works.
    # pydub.effects.eq takes an AudioSegment and band parameters.
    # Let's re-check pydub documentation for applying multiple bands.
    # The `AudioSegment.eq()` method or `pydub.effects.eq` is what we need.
    # `AudioSegment.eq(self, *bands, **kwargs)` where bands are tuples of (freq, gain_db, Q)
    # Or `pydub.effects.eq(segment, bands)`
    # The structure in pydub's `eq` effect: `eq(segment, [{'freq': 100, 'gain': -6.0, 'q': 1.0}, ...])`
    # This is not correct. The `eq` method of an AudioSegment object is what we need.
    # `sound.eq(freq, gain_db, Q)` applies one band.
    # We need to chain these or find a multi-band application method.
    # According to pydub source for effects.py `eq(seg, *bands)` where band is (freq, gain, Q)
    # This is for `from pydub.effects import eq`.
    # `equalized_sound = sound`
    # `for band in eq_bands:`
    #   `equalized_sound = equalized_sound.eq(band["freq"], band["gain"], band["q"])`
    # This seems to be the way for the `AudioSegment.eq()` method.
    # Let's use pydub.effects.eq which seems more direct for multiple bands.
    # The `pydub.effects.eq` function signature is `eq(segment, *bands_or_options)`
    # where `bands_or_options` can be `(center_freq, gain_db, Q)` tuples or dicts.

    # The `pydub_eq` function from `pydub.effects` applies a single filter.
    # We need a way to apply multiple bands.
    # A common approach with pydub is to create multiple filtered versions and mix them, or apply filters sequentially.
    # However, `AudioSegment.low_pass_filter`, `high_pass_filter`, `band_pass_filter` are available.
    # For a parametric EQ, we might need to use `scipy.signal.iirpeak` or `scipy.signal.iirfilter`
    # and apply it, or use a library that wraps this, like `pedalboard`.
    # Given the constraints, let's simplify and assume `pydub` can handle this sequentially or has a multi-band function.
    # Re-checking `pydub.effects.eq`: The example usage in some contexts shows `eq(audio_segment, *band_tuples)`.
    # Let's try a simpler interpretation first: pydub's internal eq might handle multiple bands if passed correctly.
    # The `AudioSegment.eq()` method is for a single band.
    # `from pydub.scipy_effects import eq` might be more what we need, but let's stick to `pydub.effects` if possible.

    # Simpler approach: pydub's `AudioSegment` has an `equalize` method in some forks/versions,
    # but not in the mainstream one.
    # `pydub.effects.equalize` is also not standard.

    # If `pydub.effects.eq` as `pydub_eq` can take multiple bands, it would be like:
    # `eq_params_for_pydub = [(b['freq'], b['gain'], b['q']) for b in eq_bands]`
    # `equalized_sound = pydub_eq(sound, *eq_params_for_pydub)` -- this is unlikely to work as `pydub_eq` is for one band.

    # Let's assume sequential application for now, which is standard for cascading EQs.
    equalized_sound = sound
    for band in eq_bands:
        # Ensure Q is positive, pydub might be sensitive
        q_factor = band.get("q", 1.0)
        if q_factor <= 0:
            q_factor = 0.01 # Avoid zero or negative Q, ensure it's small enough for wide band

        center_freq = band["freq"]
        gain_db = band["gain"]

        # Q factor for pydub.scipy_effects.eq (which uses scipy.signal.butter for bandpass)
        # needs to be handled carefully. For a bandpass filter, Q > 0.5 is typically required
        # to ensure the lower cutoff frequency (f0 - BW/2) is positive.
        # BW_Hz = center_freq / Q
        # We need: center_freq - (center_freq / Q) / 2 > 0
        # center_freq * (1 - 1/(2*Q)) > 0
        # Since center_freq > 0, we need 1 - 1/(2*Q) > 0  => 1 > 1/(2*Q) => 2*Q > 1 => Q > 0.5

        MIN_Q_FACTOR = 0.501 # Slightly above 0.5 to avoid floating point issues at boundary
        if q_factor < MIN_Q_FACTOR:
            q_factor = MIN_Q_FACTOR

        bandwidth_hz = center_freq / q_factor
        # This should now always be positive and center_freq - bandwidth_hz/2 will be > 0

        equalized_sound = pydub_eq(
            equalized_sound,
            focus_freq=center_freq,
            gain_dB=gain_db,
            bandwidth=bandwidth_hz, # Pass bandwidth in Hz
            filter_mode="peak"
        )

    # Convert AudioSegment back to numpy array
    # Ensure the output array is float and normalized to [-1, 1] as is common for audio processing pipelines
    samples = np.array(equalized_sound.get_array_of_samples())

    if equalized_sound.channels == 2:
        samples = samples.reshape((-1, 2)) # Reshape to (n_samples, 2) for stereo

    # Normalize to float array between -1 and 1
    # The sample_width gives bytes per sample. Max value for int16 is 32767
    max_val = float(1 << (equalized_sound.sample_width * 8 - 1)) # e.g. 32768 for 16-bit
    processed_audio_data = samples.astype(np.float32) / max_val

    return processed_audio_data


def normalize_audio_loudness(audio_data: np.ndarray, sample_rate: int, target_lufs: float = -23.0) -> np.ndarray:
    """
    Normalizes audio loudness to a target LUFS level.

    Args:
        audio_data (np.ndarray): Input audio data (mono or stereo, float format).
        sample_rate (int): Sample rate of the audio.
        target_lufs (float): Target loudness in LUFS.

    Returns:
        np.ndarray: Loudness-normalized audio data.
    """
    # pyloudnorm expects data between -1 and 1.
    # Ensure input is float
    if audio_data.dtype != np.float32 and audio_data.dtype != np.float64:
        # Assuming it might be int16, convert and normalize
        if np.issubdtype(audio_data.dtype, np.integer):
            max_int_val = np.iinfo(audio_data.dtype).max
            audio_data = audio_data.astype(np.float32) / max_int_val
        else: # If some other format, try to convert to float32 directly
            audio_data = audio_data.astype(np.float32)


    # Create a loudness meter
    meter = pyln.Meter(sample_rate) # block_size is optional

    # Measure loudness
    # pyloudnorm documentation states it expects (channels, samples) or (samples,) for mono.
    # However, its internal validator seems to have issues with this for multi-channel arrays
    # if the number of samples is large.
    # Let's try passing data as is (samples, channels) or (samples,) and see if pyloudnorm handles it.
    # The validator logic in pyloudnorm 0.1.1 appears to check data.shape[1] > 5 for channels,
    # and data.shape[0] < block_size * rate for length, which is contradictory for (C,S) format.

    # Original data is likely (samples, channels) or (samples,)
    # No transposition for now, let pyloudnorm handle it or fail consistently.
    audio_data_for_pyln = audio_data

    loudness = meter.integrated_loudness(audio_data_for_pyln)

    # Calculate gain needed and apply normalization
    normalized_audio = pyln.normalize.loudness(audio_data_for_pyln, loudness, target_lufs)

    # Ensure output shape matches input shape if it was changed by pyloudnorm
    if normalized_audio.shape != audio_data.shape and normalized_audio.size == audio_data.size:
        # This might happen if pyloudnorm internally transposes and returns transposed.
        # We want to return the same shape as input.
        if audio_data.ndim > 1 and normalized_audio.ndim > 1:
            if audio_data.shape[0] == normalized_audio.shape[1] and audio_data.shape[1] == normalized_audio.shape[0]:
                normalized_audio = normalized_audio.T # Transpose back to match original input shape

    return normalized_audio


def generate_waveform_data(audio_data: np.ndarray, sample_rate: int, points: int = 500) -> List[float]:
    """
    Generates downsampled waveform data for visualization.

    Args:
        audio_data (np.ndarray): Input audio data (mono).
        sample_rate (int): Sample rate of the audio.
        points (int): Number of data points for the waveform.

    Returns:
        List[float]: A list of peak values representing the waveform.
    """
    if audio_data.ndim > 1: # Ensure mono
        # If stereo, take the average or the first channel
        audio_mono = librosa.to_mono(audio_data.T if audio_data.shape[0] < audio_data.shape[1] else audio_data)
    else:
        audio_mono = audio_data

    num_frames = len(audio_mono)
    if num_frames == 0:
        return [0.0] * points

    step = num_frames / float(points)
    waveform_points = []

    for i in range(points):
        start = int(i * step)
        end = int((i + 1) * step)
        if start < end : # Ensure slice is not empty
            chunk = audio_mono[start:end]
            # Use the maximum absolute value in the chunk
            peak = np.max(np.abs(chunk)) if len(chunk) > 0 else 0.0
            waveform_points.append(float(peak))
        elif start < num_frames : # If step is small, take single point
             waveform_points.append(float(np.abs(audio_mono[start])))
        else: # If out of bounds due to floating point issues at the end
            waveform_points.append(0.0)


    # Normalize waveform points to be between 0 and 1 (as they are abs values)
    max_peak = np.max(waveform_points) if any(waveform_points) else 1.0
    if max_peak == 0: max_peak = 1.0 # Avoid division by zero if audio is silent

    normalized_waveform = [p / max_peak for p in waveform_points]

    return normalized_waveform
