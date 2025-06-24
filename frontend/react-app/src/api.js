const API_BASE_URL = 'http://localhost:8000';

export const processAudio = async (formData) => {
  const response = await fetch(`${API_BASE_URL}/process/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred during processing' }));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  // Check if the response is JSON (contains waveform data) or a direct audio stream
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.indexOf("application/json") !== -1) {
    // It's JSON, likely with waveform data and base64 audio
    const data = await response.json();
    const audioBytes = Uint8Array.from(atob(data.audio_b64), c => c.charCodeAt(0));
    const audioBlob = new Blob([audioBytes], { type: `audio/${data.audio_format || 'wav'}` }); // Default to wav if not specified
    const audioUrl = URL.createObjectURL(audioBlob);
    return {
      audioUrl,
      originalWaveform: data.original_waveform,
      processedWaveform: data.processed_waveform,
      downloadFilename: data.audio_filename || `processed_audio.${data.audio_format || 'wav'}`,
      isJson: true,
    };
  } else {
    // It's a direct audio stream (blob)
    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    let filename = `processed_audio.wav`; // Default filename

    const disposition = response.headers.get('Content-Disposition');
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    // We need to know the output format to correctly name the file if not in Content-Disposition
    // This information is in formData but not directly accessible here without parsing FormData,
    // or passing it separately. For now, we rely on Content-Disposition or a generic name.
    // The App.js component will still use its `outputFormat` state for the download attribute if this is not perfect.
    return {
      audioUrl,
      downloadFilename: filename,
      isJson: false,
    };
  }
};
