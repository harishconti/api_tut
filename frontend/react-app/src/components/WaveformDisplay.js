import React, { useEffect, useRef } from 'react';
import { StyledWaveformContainer } from '../styles/App.styles';

// Simple Waveform Display Component
const WaveformDisplay = ({ data, title, width = 300, height = 100, onWaveformClick, audioDuration }) => {
  const canvasRef = useRef(null);

  const handleCanvasClick = (event) => {
    if (!onWaveformClick || !data || data.length === 0 || !audioDuration) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    // const y = event.clientY - rect.top; // Not used for now

    const clickPositionRatio = x / width;
    const seekTime = clickPositionRatio * audioDuration;

    onWaveformClick(seekTime);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height); // Clear canvas

    if (data && data.length > 0) {
      // Waveform drawing logic from App.js, slightly adapted
      ctx.fillStyle = '#f7f9fa'; // Canvas background from StyledWaveformContainer
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = '#007bff'; // Waveform color
      ctx.lineWidth = 1;

      const step = width / data.length;
      const middle = height / 2;

      // Top envelope
      ctx.beginPath();
      ctx.moveTo(0, middle);
      data.forEach((val, i) => {
        const yTop = middle - (val * middle);
        ctx.lineTo(i * step, yTop);
      });
      ctx.stroke();

      // Bottom envelope (mirrored)
      ctx.beginPath();
      ctx.moveTo(0, middle);
      data.forEach((val, i) => {
         const yBottom = middle + (val * middle);
         ctx.lineTo(i * step, yBottom);
      });
      ctx.stroke();

    } else {
      // Clear canvas and show "No data" message
      ctx.fillStyle = '#f0f0f0'; // Background for no data
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#aaa'; // Text color for no data
      ctx.textAlign = 'center';
      ctx.font = '14px Arial';
      ctx.fillText(title === "Original Waveform" && !data ? 'Upload audio to see waveform' : 'No waveform data', width / 2, height / 2);
    }
  }, [data, width, height, title]);

  return (
    <StyledWaveformContainer onClick={handleCanvasClick} title={onWaveformClick ? "Click to seek" : ""}>
      <h4>{title}</h4>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ cursor: onWaveformClick ? 'pointer' : 'default' }}
      />
    </StyledWaveformContainer>
  );
};

export default WaveformDisplay;
