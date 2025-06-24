import styled from 'styled-components';

export const AppContainer = styled.div`
  text-align: center;
  padding: 20px;
  max-width: 900px; /* Max width for the main content */
  margin: 0 auto; /* Center the app content */
`;

export const AppHeader = styled.header`
  background-color: #007bff; /* Updated header color */
  padding: 25px 20px;
  color: white;
  margin-bottom: 40px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  h1 {
    margin: 0;
    font-size: 2rem;
    color: white; /* Ensure h1 inside header is white */
  }
`;

// General purpose styled components that might be used across different components
// or can be moved to a more generic styles file later if needed.

export const FormGroup = styled.div`
  margin-bottom: 20px;
  text-align: left;

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
    border: 1px solid #ccc;
    border-radius: 4px;
    box-sizing: border-box;
    transition: border-color 0.2s ease-in-out;

    &:focus {
      border-color: #007bff;
      outline: none;
    }
  }

  input[type="checkbox"] {
    margin-right: 10px;
    vertical-align: middle;
  }
`;

export const Fieldset = styled.fieldset`
  border: 1px solid #ddd;
  padding: 20px;
  border-radius: 8px;
  /* margin-bottom: 20px; */ /* Removed for better control by parent layout */

  legend {
    padding: 0 10px;
    font-weight: bold;
    color: #007bff;
  }
`;

export const Button = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s ease-in-out;
  align-self: center; /* Center button in flex form */

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #aecbfa; /* Lighter blue when disabled */
    cursor: not-allowed;
  }
`;

// More specific layout components that may use the general ones above

export const EQBandControlsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* Responsive grid */
  gap: 15px; /* Gap between controls */
  align-items: end; /* Align items to the bottom of their grid cell, useful for labels above inputs */

  /* If you want to specifically target FormGroup within this grid for layout adjustments */
  & > ${FormGroup} {
    margin-bottom: 0; /* Remove default bottom margin from FormGroup if it's too much in grid */
    display: flex; /* Allow label and input to be stacked if needed */
    flex-direction: column;
    justify-content: flex-end; /* Aligns content to bottom, useful if heights vary */
  }

   /* Adjust label styling if necessary for grid layout */
  label {
    font-size: 0.9em; /* Slightly smaller labels for compact layout */
    margin-bottom: 4px; /* Reduced space between label and input */
  }

  input[type="number"],
  input[type="range"],
  select {
    padding: 8px; /* Slightly reduced padding for compactness */
    font-size: 0.9em;
  }
`;

export const MainContent = styled.main`
  background-color: #ffffff; /* White background for content area */
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.07);
`;

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px; /* Spacing between form elements */
`;

export const TwoColumnFormLayout = styled.div`
  display: flex;
  gap: 30px; /* Space between columns */
  /* margin-bottom: 20px; /* Removed as submit button is now inside a column */

  @media (max-width: 768px) {
    flex-direction: column; /* Stack columns on smaller screens */
  }

  & > div {
    flex: 1; /* Each child div takes equal width */
    min-width: 0; /* Prevent flex overflow issues */
  }
`;

export const MainAppLayout = styled.div`
  display: flex;
  gap: 30px; /* Space between main columns */
  margin-bottom: 30px; /* Space before results section */

  @media (max-width: 768px) {
    flex-direction: column; /* Stack columns on smaller screens */
  }
`;

export const LeftColumn = styled.div`
  flex: 1; /* Adjust flex basis as needed, e.g., flex: 0 0 300px; for fixed width */
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

export const RightColumn = styled.div`
  flex: 2; /* Adjust flex basis as needed */
`;

export const SettingsCardContainer = styled.div`
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
    font-size: 1.2rem;
    border-bottom: 1px solid #ccc;
    padding-bottom: 10px;
  }
`;


export const ResultsSection = styled.div`
  margin-top: 30px;
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);

  h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.5rem;
    margin-bottom: 20px;
    text-align: center;
  }
`;

export const WaveformsDisplayLayout = styled.div`
  display: flex;
  justify-content: space-around;
  gap: 20px;
  margin-bottom: 20px; /* Space before audio player */

  @media (max-width: 600px) {
    flex-direction: column;
  }
`;


export const ControlGroupWrapper = styled.div`
  /* This can be used to group controls if needed, for now, it's a simple div */
  /* If we need columns within AudioControls, we'd add flex properties here */
`;

// export const ErrorMessage = styled.div` // Commented out as it's replaced by react-toastify
//   color: #D8000C;
//   background-color: #FFD2D2;
//   border: 1px solid #D8000C;
//   padding: 15px;
//   margin-top: 20px;
//   border-radius: 4px;
//   text-align: left;
// `;

export const WaveformsSection = styled.div`
  display: flex;
  justify-content: space-around;
  margin-top: 30px;
  gap: 20px;
  flex-wrap: wrap;
`;

// Specific component styles - can be moved to their own files if they grow
export const StyledAudioPlayer = styled.div`
  /* margin-top: 30px; */ /* Removed, as ResultsSection and WaveformsDisplayLayout handle spacing */
  padding: 20px;
  background-color: #ffffff; /* Consistent with Waveform container cards */
  border: 1px solid #e0e0e0; /* Consistent with Waveform container cards */
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05); /* Consistent shadow */

  h2 {
    margin-top: 0;
    color: #333;
    font-size: 1.5rem;
    margin-bottom: 15px;
  }

  audio {
    width: 100%;
    margin-bottom: 20px;
  }

  a {
    display: inline-block;
    text-decoration: none;
    background-color: #28a745; /* Green for download */
    color: white;
    padding: 10px 15px;
    border-radius: 4px;
    font-weight: bold;
    transition: background-color 0.2s ease-in-out;

    &:hover {
      background-color: #218838;
    }
  }
`;

export const StyledWaveformContainer = styled.div`
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  /* min-width: 300px; // This is good, but might be better on a wrapper if this is the direct canvas wrapper */
  flex: 1; /* Allow flex items to grow and shrink */
  min-width: 280px; /* Ensure a minimum width */


  h4 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #007bff; /* Title color */
    font-size: 1.1rem;
  }

  canvas {
    border: 1px solid #d1d1d1;
    border-radius: 4px;
    background-color: #f7f9fa; /* Light background for canvas itself */
  }
`;
/*
  Note: Some styles like `.form-group`, `button` details, `error-message` etc. were in GlobalStyle.
  If we want more specific versions for App components, we define them here.
  Otherwise, GlobalStyle will cover them.
  For this refactor, I'm creating more specific styled components for better encapsulation
  and to reduce reliance on global class names.
*/
