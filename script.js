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

// Set canvas dimensions to create a virtually limitless board
function resizeCanvas() {
  // Instead of matching container size, we set a huge canvas size.
  canvas.width = 5000;
  canvas.height = 5000;
  // After setting the size, center the scroll position so that the user sees the middle of the board.
  container.scrollLeft = (canvas.width - container.clientWidth) / 2;
  container.scrollTop = (canvas.height - container.clientHeight) / 2;
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

// Update active tool highlighting
function updateActiveTool(selectedTool) {
  const toolButtons = [penBtn, eraserBtn, lineBtn, rectBtn, circleBtn, textBtn];
  toolButtons.forEach(button => button.classList.remove('active'));
  switch(selectedTool) {
    case 'pen':
      penBtn.classList.add('active');
      break;
    case 'eraser':
      eraserBtn.classList.add('active');
      break;
    case 'line':
      lineBtn.classList.add('active');
      break;
    case 'rect':
      rectBtn.classList.add('active');
      break;
    case 'circle':
      circleBtn.classList.add('active');
      break;
    case 'text':
      textBtn.classList.add('active');
      break;
  }
}

// Set current tool functions with active highlighting
penBtn.addEventListener('click', () => { tool = 'pen'; updateActiveTool('pen'); });
eraserBtn.addEventListener('click', () => { tool = 'eraser'; updateActiveTool('eraser'); });
lineBtn.addEventListener('click', () => { tool = 'line'; updateActiveTool('line'); });
rectBtn.addEventListener('click', () => { tool = 'rect'; updateActiveTool('rect'); });
circleBtn.addEventListener('click', () => { tool = 'circle'; updateActiveTool('circle'); });
textBtn.addEventListener('click', () => { tool = 'text'; updateActiveTool('text'); });

// Set Pen as active by default on load
updateActiveTool('pen');

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
  // For pen, finish the path. (For eraser, the stroke is already applied during movement.)
  if (tool === 'pen') {
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

// New export function that crops blank areas while preserving transparency
function exportCroppedImage() {
  // Create an offscreen canvas and copy the current board without a background fill
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;
  const exportCtx = exportCanvas.getContext('2d');
  exportCtx.drawImage(canvas, 0, 0);

  // Retrieve image data and determine the bounding box of non-transparent pixels
  const imageData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
  const data = imageData.data;
  const w = exportCanvas.width;
  const h = exportCanvas.height;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  let found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = (y * w + x) * 4;
      // Check if the pixel has non-zero alpha
      if (data[index + 3] > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // If no drawn pixels are found, export a minimal image.
  if (!found) {
    minX = 0;
    minY = 0;
    maxX = 1;
    maxY = 1;
  }

  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(exportCanvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const croppedDataURL = croppedCanvas.toDataURL();
  const link = document.createElement('a');
  link.download = 'whiteboard.png';
  link.href = croppedDataURL;
  link.click();
}

// Updated download button event to export only the cropped area with transparency
downloadBtn.addEventListener('click', () => {
  exportCroppedImage();
});

// Toggle grid background: now toggles grid on the canvas element
gridToggle.addEventListener('click', () => {
  canvas.classList.toggle('grid');
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
