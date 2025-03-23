import React, { useRef, useState, useEffect } from 'react';

const Whiteboard = () => {
  const canvasRef = useRef(null);
  // State for drawing modes and settings
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen'); // Options: 'pen', 'eraser', 'line', 'rect', 'circle', 'text'
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  // For undo/redo functionality we store dataURLs of the canvas state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  // Temporarily store the canvas image when drawing a shape
  const [tempImage, setTempImage] = useState(null);

  // On mount, set canvas size and save initial state
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    // Set canvas dimensions to fill the container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    // Save initial blank state
    saveState();
  }, []);

  // Save current canvas state for undo
  const saveState = () => {
    const canvas = canvasRef.current;
    setUndoStack((prev) => [...prev, canvas.toDataURL()]);
    // Clear redo stack on new action
    setRedoStack([]);
  };

  // Handle pointer down (mouse/touch)
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    // Support both mouse and touch events
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);

    // For shape tools, save a temporary snapshot to allow live preview
    if (tool !== 'pen' && tool !== 'eraser') {
      setTempImage(canvas.toDataURL());
    }

    // For text insertion, prompt for input and render immediately
    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        ctx.fillStyle = color;
        ctx.font = `${lineWidth * 5}px Arial`;
        ctx.fillText(text, x, y);
        saveState();
      }
      setIsDrawing(false);
    }

    // For freehand drawing or erasing, begin the path
    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  // Handle pointer move for drawing
  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      // Use globalCompositeOperation to erase parts of the drawing
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = lineWidth * 2;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      // For shape tools, draw a preview by restoring the temporary image
      const img = new Image();
      img.src = tempImage;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (tool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else if (tool === 'rect') {
          let width = x - startPos.x;
          let height = y - startPos.y;
          // If shift key is held, draw a square
          if (e.shiftKey) {
            const size = Math.min(Math.abs(width), Math.abs(height));
            width = width < 0 ? -size : size;
            height = height < 0 ? -size : size;
          }
          ctx.strokeRect(startPos.x, startPos.y, width, height);
        } else if (tool === 'circle') {
          let radiusX = (x - startPos.x) / 2;
          let radiusY = (y - startPos.y) / 2;
          // If shift key is held, force a circle
          if (e.shiftKey) {
            const r = Math.min(Math.abs(radiusX), Math.abs(radiusY));
            radiusX = radiusX < 0 ? -r : r;
            radiusY = radiusY < 0 ? -r : r;
          }
          const centerX = startPos.x + radiusX;
          const centerY = startPos.y + radiusY;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, Math.abs(radiusX), Math.abs(radiusY), 0, 0, 2 * Math.PI);
          ctx.stroke();
        }
      };
    }
  };

  // Handle pointer up event
  const handlePointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // For all tools, save the current state for undo functionality
    saveState();
  };

  // Undo the last action
  const undo = () => {
    if (undoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const lastState = undoStack[undoStack.length - 1];
    // Remove last state and add current state to redo stack
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setRedoStack((prev) => [...prev, canvas.toDataURL()]);
    const img = new Image();
    img.src = lastState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  // Redo an undone action
  const redo = () => {
    if (redoStack.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setUndoStack((prev) => [...prev, canvas.toDataURL()]);
    const img = new Image();
    img.src = nextState;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  };

  // Clear the entire canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  };

  // Download the current canvas as a PNG image
  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="whiteboard-container">
      {/* Toolbar with buttons and controls */}
      <div className="toolbar">
        <button onClick={() => setTool('pen')}>Pen</button>
        <button onClick={() => setTool('eraser')}>Eraser</button>
        <button onClick={() => setTool('line')}>Line</button>
        <button onClick={() => setTool('rect')}>Rectangle</button>
        <button onClick={() => setTool('circle')}>Circle</button>
        <button onClick={() => setTool('text')}>Text</button>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          title="Pick a color"
        />
        <input
          type="range"
          min="1"
          max="50"
          value={lineWidth}
          onChange={(e) => setLineWidth(e.target.value)}
          title="Stroke Thickness"
        />
        <button onClick={undo}>Undo</button>
        <button onClick={redo}>Redo</button>
        <button onClick={clearCanvas}>Clear</button>
        <button onClick={downloadImage}>Download</button>
      </div>
      {/* Canvas element with mouse and touch events */}
      <canvas
        ref={canvasRef}
        className="whiteboard-canvas"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
};

export default Whiteboard;
