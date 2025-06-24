import React from 'react';
import { FormGroup } from '../styles/App.styles'; // Import FormGroup

const FileUpload = ({ onFileChange, selectedFile, isLoading }) => {
  return (
    <FormGroup> {/* Use styled FormGroup */}
      <label htmlFor="audioFile">Upload Audio File (wav, mp3, flac):</label>
      <input
        type="file"
        id="audioFile"
        accept=".wav,.mp3,.flac"
        onChange={onFileChange}
        disabled={isLoading}
      />
      {selectedFile && <p style={{ marginTop: '10px', fontSize: '0.9em' }}>Selected: {selectedFile.name}</p>}
    </FormGroup>
  );
};

export default FileUpload;
