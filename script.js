// Get references to DOM elements
const canvas = document.getElementById('canvas');
const container = document.getElementById('canvas-container');
const ctx = canvas.getContext('2d');

const penBtn = document.getElementById('pen-btn');
const eraserBtn = document.getElementById('eraser-btn');
const lineBtn = document.getElementById('line-btn');
const rectBtn = document.getElementById('rect-btn');
const circleBtn = document.getElementById('circle-btn');
const textBtn = document.getElementById('text-btn');

const colorPicker = document.getElementById('color-picker');
const thicknessSlider = document.getElementById('thickness');

const undoBtn = document.getElementById('undo-btn');
const redoBtn = document.getElementById('redo-btn');
const clearBtn = document.getElementById('clear-btn');
const downloadBtn = document.getElementById('download-btn');

const gridToggle = document.getElementById('grid-toggle');
const modeToggle = document.getElementById('mode-toggle');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');

// Global drawing variables
let tool = 'pen'; // Tools: pen, eraser, line, rect, circle, text
let color = colorPicker.value;
let lineWidth = thicknessSlider.value;
let isDrawing = false;
let startPos = { x: 0, y: 0 };
let tempImage = null; // For shape preview
let undoStack = [];
let redoStack = [];
let scale = 1; // Zoom scale factor

// Set canvas dimensions to fill container on load
function resizeCanvas() {
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  // After resizing, you might want to restore the previous drawing state
  // (This sample does not handle dynamic resizing to keep it simple.)
}
resizeCanvas();

// Save the current canvas state for undo
function saveState() {
  undoStack.push(canvas.toDataURL());
  // Clear redo stack on new action
  redoStack = [];
}

// Helper to get pointer coordinates adjusted for canvas scale and container offset
function getCanvasCoordinates(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;
  if (e.touches) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  // Adjust for canvas position and zoom scale
  const x = (clientX - rect.left) / scale;
  const y = (clientY - rect.top) / scale;
  return { x, y };
}

// Set current tool functions
penBtn.addEventListener('click', () => { tool = 'pen'; });
eraserBtn.addEventListener('click', () => { tool = 'eraser'; });
lineBtn.addEventListener('click', () => { tool = 'line'; });
rectBtn.addEventListener('click', () => { tool = 'rect'; });
circleBtn.addEventListener('click', () => { tool = 'circle'; });
textBtn.addEventListener('click', () => { tool = 'text'; });

// Update color and thickness from controls
colorPicker.addEventListener('change', (e) => {
  color = e.target.value;
});
thicknessSlider.addEventListener('change', (e) => {
  lineWidth = e.target.value;
});

// Pointer (mouse/touch) event handlers
function pointerDown(e) {
  e.preventDefault();
  const pos = getCanvasCoordinates(e);
  startPos = pos;
  isDrawing = true;

  // For shape tools, save a snapshot for preview
  if (tool !== 'pen' && tool !== 'eraser') {
    tempImage = canvas.toDataURL();
  }

  // For text tool, prompt for input immediately
  if (tool === 'text') {
    const text = prompt('Enter text:');
    if (text) {
      ctx.fillStyle = color;
      ctx.font = `${lineWidth * 5}px Arial`;
      ctx.fillText(text, pos.x, pos.y);
      saveState();
    }
    isDrawing = false;
    return;
  }

  // For pen/eraser, begin a new path
  if (tool === 'pen' || tool === 'eraser') {
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }
}

function pointerMove(e) {
  if (!isDrawing) return;
  const pos = getCanvasCoordinates(e);

  if (tool === 'pen') {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  } else if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = lineWidth * 2;
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else if (tool === 'line' || tool === 'rect' || tool === 'circle') {
    // For shapes, draw preview using the saved image snapshot
    const img = new Image();
    img.src = tempImage;
    img.onload = () => {
      // Clear the canvas and redraw the saved state
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const savedImg = new Image();
      savedImg.src = tempImage;
      savedImg.onload = () => {
        ctx.drawImage(savedImg, 0, 0);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (tool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startPos.x, startPos.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        } else if (tool === 'rect') {
          let width = pos.x - startPos.x;
          let height = pos.y - startPos.y;
          // Hold Shift for square
          if (e.shiftKey) {
            const size = Math.min(Math.abs(width), Math.abs(height));
            width = width < 0 ? -size : size;
            height = height < 0 ? -size : size;
          }
          ctx.strokeRect(startPos.x, startPos.y, width, height);
        } else if (tool === 'circle') {
          let radiusX = (pos.x - startPos.x) / 2;
          let radiusY = (pos.y - startPos.y) / 2;
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
      }
    }
  }
}

function pointerUp(e) {
  if (!isDrawing) return;
  isDrawing = false;
  // For pen/eraser, finish the path
  if (tool === 'pen' || tool === 'eraser') {
    ctx.stroke();
  }
  saveState();
}

// Attach both mouse and touch events
canvas.addEventListener('mousedown', pointerDown);
canvas.addEventListener('mousemove', pointerMove);
canvas.addEventListener('mouseup', pointerUp);
canvas.addEventListener('mouseout', pointerUp);

canvas.addEventListener('touchstart', pointerDown);
canvas.addEventListener('touchmove', pointerMove);
canvas.addEventListener('touchend', pointerUp);

// Undo functionality
undoBtn.addEventListener('click', () => {
  if (undoStack.length === 0) return;
  const lastState = undoStack.pop();
  redoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = lastState;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
});

// Redo functionality
redoBtn.addEventListener('click', () => {
  if (redoStack.length === 0) return;
  const nextState = redoStack.pop();
  undoStack.push(canvas.toDataURL());
  const img = new Image();
  img.src = nextState;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
});

// Clear canvas button
clearBtn.addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

// Download canvas as PNG
downloadBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = canvas.toDataURL();
  link.click();
});

// Toggle grid background on the container
gridToggle.addEventListener('click', () => {
  container.classList.toggle('grid');
});

// Toggle light/dark mode by toggling a class on the body
modeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
});

// Zoom controls – adjust scale and update canvas CSS transform
function updateZoom() {
  canvas.style.transform = `scale(${scale})`;
}
zoomInBtn.addEventListener('click', () => {
  scale += 0.1;
  updateZoom();
});
zoomOutBtn.addEventListener('click', () => {
  if (scale > 0.2) { // prevent zooming out too far
    scale -= 0.1;
    updateZoom();
  }
});
