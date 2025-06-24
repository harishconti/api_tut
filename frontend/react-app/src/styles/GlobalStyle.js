import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #f4f7f6; /* Light gray background */
    color: #333; /* Darker text for readability */
  }

  code {
    font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
      monospace;
  }

  .App {
    text-align: center;
    padding: 20px;
  }

  .App-header {
    background-color: #282c34; /* Darker header */
    padding: 20px;
    color: white;
    margin-bottom: 30px;
    border-radius: 8px;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #333; /* Consistent heading color */
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: #555;
  }

  input[type="file"],
  input[type="range"],
  select {
    width: 100%;
    padding: 10px;
    margin-bottom: 20px;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
  }

  input[type="checkbox"] {
    margin-right: 8px;
    vertical-align: middle;
  }

  button {
    background-color: #007bff; /* Primary button color */
    color: white;
    padding: 12px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: #0056b3; /* Darker on hover */
    }

    &:disabled {
      background-color: #cccccc;
      cursor: not-allowed;
    }
  }

  .form-group {
    margin-bottom: 25px;
    text-align: left;
  }

  fieldset.form-group {
    border: 1px solid #ddd;
    padding: 20px;
    border-radius: 8px;
  }

  legend {
    padding: 0 10px;
    font-weight: bold;
    color: #007bff;
  }

  .error-message {
    color: #D8000C; /* Red for errors */
    background-color: #FFD2D2; /* Light red background */
    border: 1px solid #D8000C;
    padding: 15px;
    margin-top: 20px;
    border-radius: 4px;
    text-align: left;
  }

  .audio-player {
    margin-top: 30px;
    padding: 20px;
    background-color: #fff;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .audio-player h2 {
    margin-top: 0;
  }

  .audio-player audio {
    width: 100%;
    margin-bottom: 15px;
  }

  .audio-player a {
    display: inline-block;
    text-decoration: none;
    background-color: #28a745; /* Green for download */
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: #218838; /* Darker green on hover */
    }
  }

  .waveforms-section {
    display: flex;
    justify-content: space-around;
    margin-top: 30px;
    gap: 20px; /* Adds space between waveform displays */
    flex-wrap: wrap; /* Allows wrapping on smaller screens */
  }

  .waveform-container {
    padding: 15px;
    background-color: #fff;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    min-width: 300px; /* Ensure canvas is not too squished */
  }

  .waveform-container h4 {
    margin-top: 0;
    margin-bottom: 10px;
    color: #555;
  }

  canvas {
    border: 1px solid #ccc;
    border-radius: 4px;
  }
`;

export default GlobalStyle;
