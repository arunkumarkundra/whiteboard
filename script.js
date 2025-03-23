document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const gridCanvas = document.getElementById('gridCanvas');
    const gridCtx = gridCanvas.getContext('2d');
    const container = document.getElementById('container');
    const canvasContainer = document.getElementById('canvasContainer');
    const toolbar = document.getElementById('toolbar');
    const colorPicker = document.getElementById('colorPicker');
    const colorIndicator = document.querySelector('.color-indicator');
    const strokeWidth = document.getElementById('strokeWidth');
    const strokeWidthValue = document.getElementById('strokeWidthValue');
    const strokeBtn = document.getElementById('strokeBtn');
    const strokeDropdown = document.getElementById('strokeDropdown');
    const textInputContainer = document.getElementById('textInputContainer');
    const textInput = document.getElementById('textInput');
    const mousePosition = document.getElementById('mousePosition');
    const zoomLevelDisplay = document.getElementById('zoomLevel');
    
    // Tool buttons
    const toolBtns = document.querySelectorAll('.tool-btn');
    const penTool = document.getElementById('penTool');
    const lineTool = document.getElementById('lineTool');
    const arrowTool = document.getElementById('arrowTool');
    const rectangleTool = document.getElementById('rectangleTool');
    const circleTool = document.getElementById('circleTool');
    const textTool = document.getElementById('textTool');
    const eraserTool = document.getElementById('eraserTool');
    
    // Action buttons
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const resetBtn = document.getElementById('resetBtn');
    const gridBtn = document.getElementById('gridBtn');
    const themeBtn = document.getElementById('themeBtn');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    // Canvas state variables
    let currentTool = 'pen';
    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    let showGrid = false;
    let isDarkTheme = false;
    let drawings = [];
    let redoStack = [];
    let currentDrawing = null;
    let currentStrokeWidth = 5;
    let currentColor = '#000000';
    
    // Initialize canvas
    function initCanvas() {
        // Set canvas size to match container
        resizeCanvas();
        
        // Set initial tool
        setActiveTool(penTool);
        
        // Draw grid (initially hidden)
        drawGrid();
        
        // Event listeners
        setupEventListeners();
    }
    
    function resizeCanvas() {
        // Set a large fixed size for the canvas instead of matching the container
        canvas.width = 5000;  // Large width for infinite canvas
        canvas.height = 5000; // Large height for infinite canvas
        gridCanvas.width = 5000;
        gridCanvas.height = 5000;

        // Redraw content and grid
        redrawCanvas();
        drawGrid();
    }
    
    function setupEventListeners() {
        // Mouse events for drawing
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
    
    // Add event listener for the text save button
    const textSaveBtn = document.getElementById('textSaveBtn');
    if (textSaveBtn) {
        textSaveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            applyText();
        });
    }
    
        // Touch events for mobile support
        canvas.addEventListener('touchstart', touchStartDrawing);
        canvas.addEventListener('touchmove', touchDraw);
        canvas.addEventListener('touchend', stopDrawing);
        
        // Mouse position tracking
        canvas.addEventListener('mousemove', updateMousePosition);
        
        // Tool selection
        toolBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                setActiveTool(this);
            });
        });
        
        // Color picker
        colorPicker.addEventListener('input', function() {
            currentColor = this.value;
            colorIndicator.style.backgroundColor = currentColor;
        });
        
        // Stroke width
        strokeWidth.addEventListener('input', function() {
            currentStrokeWidth = this.value;
            strokeWidthValue.textContent = `${this.value}px`;
        });
        
        // Stroke dropdown toggle
        strokeBtn.addEventListener('click', function() {
            strokeDropdown.classList.toggle('active');
        });
        
        // Close stroke dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!strokeBtn.contains(e.target) && !strokeDropdown.contains(e.target)) {
                strokeDropdown.classList.remove('active');
            }
        });
        
        // Action buttons
        undoBtn.addEventListener('click', undo);
        redoBtn.addEventListener('click', redo);
        resetBtn.addEventListener('click', resetCanvas);
        gridBtn.addEventListener('click', toggleGrid);
        themeBtn.addEventListener('click', toggleTheme);
        zoomInBtn.addEventListener('click', zoomIn);
        zoomOutBtn.addEventListener('click', zoomOut);
        downloadBtn.addEventListener('click', downloadCanvas);
        
        // Text tool events
        textInput.addEventListener('blur', applyText);
        
        // Pan with middle mouse button
        canvas.addEventListener('mousedown', startPan);
        canvas.addEventListener('mousemove', pan);
        canvas.addEventListener('mouseup', stopPan);
        
        // Zoom with mouse wheel
        canvasContainer.addEventListener('wheel', handleWheel);
        
        // Window resize
        window.addEventListener('resize', resizeCanvas);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);
    }
    
    // Tool handling
    function setActiveTool(toolElement) {
        // Remove active class from all tools
        toolBtns.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to selected tool
        toolElement.classList.add('active');
        
        // Set current tool
        currentTool = toolElement.id.replace('Tool', '');
        
        // Update cursor based on tool
        updateCursor();
    }
    
    function updateCursor() {
        switch(currentTool) {
            case 'pen':
                canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>') 12 12, auto`;
                break;
            case 'line':
            case 'arrow':
            case 'rectangle':
            case 'circle':
                canvas.style.cursor = 'crosshair';
                break;
            case 'text':
                canvas.style.cursor = 'text';
                break;
            case 'eraser':
                canvas.style.cursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2"><rect x="8" y="8" width="8" height="8" rx="2"/></svg>') 12 12, auto`;
                break;
            default:
                canvas.style.cursor = 'default';
        }
    }
    
    // Drawing functions
    function startDrawing(e) {
        if (e.button === 1) return; // Middle mouse button is for panning
        
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        startX = (e.clientX - rect.left - offsetX) / scale;
        startY = (e.clientY - rect.top - offsetY) / scale;
        lastX = startX;
        lastY = startY;
        
        // Create new drawing object
        currentDrawing = {
            tool: currentTool,
            color: currentTool === 'eraser' ? '#ffffff' : currentColor,
            width: currentStrokeWidth,
            points: [{ x: startX, y: startY }],
            text: ''
        };
        
        if (currentTool === 'text') {
            placeTextInput(startX, startY);
        }
    }
    
    function touchStartDrawing(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            
            // Create a simulated mouse event
            const mouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0,
                preventDefault: function() {}
            };
            
            startDrawing(mouseEvent);
        }
    }    
    function draw(e) {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const currentX = (e.clientX - rect.left - offsetX) / scale;
        const currentY = (e.clientY - rect.top - offsetY) / scale;
        
        // Save the last mouse position for use in stopDrawing
        lastX = e.clientX;
        lastY = e.clientY;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        if (currentTool === 'pen') {
            // Add point to the current drawing
            currentDrawing.points.push({ x: currentX, y: currentY });
            
            // Draw the line segment
            ctx.beginPath();
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = currentStrokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Draw from the previous point to the current point
            const prevPoint = currentDrawing.points[currentDrawing.points.length - 2];
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        } else if (currentTool === 'eraser') {
            // Add point to the current drawing
            currentDrawing.points.push({ x: currentX, y: currentY });
            
            // Draw the eraser segment
            ctx.beginPath();
            ctx.strokeStyle = isDarkTheme ? '#2d2d2d' : '#ffffff';
            ctx.lineWidth = currentStrokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Draw from the previous point to the current point
            const prevPoint = currentDrawing.points[currentDrawing.points.length - 2];
            ctx.moveTo(prevPoint.x, prevPoint.y);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        } else {
            // For shape tools, we'll just preview during movement
            ctx.restore(); // Restore before drawing preview
            drawPreview(currentX, currentY);
            return; // Skip the restore at the end
        }
        
        ctx.restore();
    }
    
    function touchDraw(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            draw(mouseEvent);
        }
    }
    
    function stopDrawing() {
        if (!isDrawing) return;
        
        if (currentTool !== 'text') {
            // For non-pen/eraser tools, ensure points are added
            if (currentTool !== 'pen' && currentTool !== 'eraser') {
                const rect = canvas.getBoundingClientRect();
                const currentX = (lastX - rect.left - offsetX) / scale;
                const currentY = (lastY - rect.top - offsetY) / scale;
                
                // Ensure we have at least two points for shape tools
                if (!currentDrawing.points || currentDrawing.points.length < 2) {
                    currentDrawing.points = [{ x: startX, y: startY }, { x: currentX, y: currentY }];
                }
            }
            
            // Add drawing to history
            drawings.push(currentDrawing);
            redoStack = []; // Clear redo stack when new drawing is added
            
            // Update undo/redo button states
            updateUndoRedoButtons();
            
            // Redraw canvas to ensure the final drawing is correctly shown
            redrawCanvas();
        }
        
        isDrawing = false;
    }

    function drawLine(fromX, fromY, toX, toY, isEraser = false) {
        ctx.beginPath();
        ctx.moveTo(fromX * scale + offsetX, fromY * scale + offsetX);
        ctx.lineTo(toX * scale + offsetX, toY * scale + offsetY);
        ctx.strokeStyle = isEraser ? (isDarkTheme ? '#2d2d2d' : '#ffffff') : currentColor;
        ctx.lineWidth = currentStrokeWidth * scale;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
    
    function drawPreview(currentX, currentY) {
        // First, redraw all existing drawings
        redrawCanvas();
        
        // Then draw the current preview on top
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentStrokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (currentTool === 'line') {
            // Draw straight line
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
        } else if (currentTool === 'arrow') {
            // Draw arrow
            const headLength = 15;
            const dx = currentX - startX;
            const dy = currentY - startY;
            const angle = Math.atan2(dy, dx);
            
            // Line
            ctx.moveTo(startX, startY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            
            // Arrowhead
            ctx.beginPath();
            ctx.moveTo(currentX, currentY);
            ctx.lineTo(currentX - headLength * Math.cos(angle - Math.PI / 6), currentY - headLength * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(currentX - headLength * Math.cos(angle + Math.PI / 6), currentY - headLength * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fillStyle = currentColor;
            ctx.fill();
        } else if (currentTool === 'rectangle') {
            // Draw rectangle
            const width = currentX - startX;
            const height = currentY - startY;
            ctx.rect(startX, startY, width, height);
            ctx.stroke();
        } else if (currentTool === 'circle') {
            // Draw circle
            const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
            ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    function drawArrow(fromX, fromY, toX, toY) {
        const headLength = 15;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);
        
        // Line
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = currentColor;
        ctx.fill();
    } 
    // Text tool functions

function placeTextInput(x, y) {
    // Store the canvas coordinates for later use
    startX = x;
    startY = y;
    
    // Get the canvas container's position and scroll offsets
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    
    // Calculate base position
    let screenX = (x * scale) + offsetX + (canvasRect.left - containerRect.left) - canvasContainer.scrollLeft;
    let screenY = (y * scale) + offsetY + (canvasRect.top - containerRect.top) - canvasContainer.scrollTop;
    
    // Adjust for textarea padding (5px from CSS)
    const paddingOffset = 9 * scale; // Scale the padding to match canvas scale
    screenX -= paddingOffset;
    screenY -= paddingOffset;
    
    // Position the text input container
    textInputContainer.style.display = 'block';
    textInputContainer.style.left = `${screenX}px`;
    textInputContainer.style.top = `${screenY}px`;
    
    // Make sure the save button is visible
    const textSaveBtn = document.getElementById('textSaveBtn');
    if (textSaveBtn) {
        textSaveBtn.style.display = 'flex';
    }
    
    // Style the text input
    textInput.value = '';
    textInput.style.color = currentColor;
    textInput.style.fontSize = `${currentStrokeWidth * 3}px`;
    
    // Focus the text input
    setTimeout(() => {
        textInput.focus();
    }, 10);
}





    function applyText() {
        if (textInput.value.trim() !== '') {
            // Ensure currentDrawing is properly configured for text
            currentDrawing.tool = 'text';
            currentDrawing.text = textInput.value;
            currentDrawing.x = startX;
            currentDrawing.y = startY;
            currentDrawing.fontSize = currentStrokeWidth * 3;
            currentDrawing.color = currentColor;
            
            // Add text to drawings
            drawings.push(currentDrawing);
            redoStack = []; // Clear redo stack
            updateUndoRedoButtons();
            
            // Redraw canvas to show the text
            redrawCanvas();
        }
        
        // Hide text input
        textInputContainer.style.display = 'none';
    }
    
    // Canvas management
    function redrawCanvas() {
        // Clear canvas
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformation
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        // Redraw all shapes
        drawings.forEach(drawing => {
            if (drawing.tool === 'pen' || drawing.tool === 'eraser') {
                // Draw line segments
                if (drawing.points.length < 2) return;
                
                ctx.beginPath();
                ctx.strokeStyle = drawing.tool === 'eraser' ? (isDarkTheme ? '#2d2d2d' : '#ffffff') : drawing.color;
                ctx.lineWidth = drawing.width;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
                for (let i = 1; i < drawing.points.length; i++) {
                    ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
                }
                ctx.stroke();
            } else if (drawing.tool === 'line') {
                // Draw line
                if (drawing.points.length < 2) return;
                
                ctx.beginPath();
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = drawing.width;
                ctx.lineCap = 'round';
                
                ctx.moveTo(drawing.points[0].x, drawing.points[0].y);
                ctx.lineTo(drawing.points[1].x, drawing.points[1].y);
                ctx.stroke();
            } else if (drawing.tool === 'arrow') {
                // Draw arrow
                if (drawing.points.length < 2) return;
                
                const fromX = drawing.points[0].x;
                const fromY = drawing.points[0].y;
                const toX = drawing.points[1].x;
                const toY = drawing.points[1].y;
                
                ctx.beginPath();
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = drawing.width;
                ctx.lineCap = 'round';
                
                drawArrow(fromX, fromY, toX, toY);
            } else if (drawing.tool === 'rectangle') {
                // Draw rectangle
                if (drawing.points.length < 2) return;
                
                const startX = drawing.points[0].x;
                const startY = drawing.points[0].y;
                const endX = drawing.points[1].x;
                const endY = drawing.points[1].y;
                const width = endX - startX;
                const height = endY - startY;
                
                ctx.beginPath();
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = drawing.width;
                ctx.rect(startX, startY, width, height);
                ctx.stroke();
            } else if (drawing.tool === 'circle') {
                // Draw circle
                if (drawing.points.length < 2) return;
                
                const centerX = drawing.points[0].x;
                const centerY = drawing.points[0].y;
                const pointX = drawing.points[1].x;
                const pointY = drawing.points[1].y;
                const radius = Math.sqrt(Math.pow(pointX - centerX, 2) + Math.pow(pointY - centerY, 2));
                
                ctx.beginPath();
                ctx.strokeStyle = drawing.color;
                ctx.lineWidth = drawing.width;
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.stroke();
            } else if (drawing.tool === 'text') {
                // Draw text
                ctx.font = `${drawing.fontSize}px Arial`;
                ctx.fillStyle = drawing.color;
                ctx.textBaseline = 'top';
                
                const lines = drawing.text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    ctx.fillText(lines[i], drawing.x, drawing.y + i * drawing.fontSize);
                }
            }
        });
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    
    function resetCanvas() {
        if (confirm('Are you sure you want to clear the canvas?')) {
            drawings = [];
            redoStack = [];
            updateUndoRedoButtons();
            redrawCanvas();
        }
    }
    
    function drawGrid() {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        
        if (!showGrid) return;
        
        const gridSize = 20 * scale;
        const offsetXMod = (offsetX % gridSize + gridSize) % gridSize;
        const offsetYMod = (offsetY % gridSize + gridSize) % gridSize;
        
        gridCtx.beginPath();
        gridCtx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid-color');
        gridCtx.lineWidth = 1;
        
        // Draw vertical lines across the entire canvas
        for (let x = offsetXMod; x < gridCanvas.width; x += gridSize) {
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, gridCanvas.height);
        }
        
        // Draw horizontal lines across the entire canvas
        for (let y = offsetYMod; y < gridCanvas.height; y += gridSize) {
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(gridCanvas.width, y);
        }
        
        gridCtx.stroke();
    }
    
    // Zoom and Pan
    function zoomIn() {
        scale *= 1.2;
        scale = Math.min(scale, 5); // Max zoom level
        updateTransform();

        // Center the scroll position after zooming
        canvasContainer.scrollLeft = (canvasContainer.scrollLeft + canvasContainer.clientWidth / 2) * 1.2 - canvasContainer.clientWidth / 2;
        canvasContainer.scrollTop = (canvasContainer.scrollTop + canvasContainer.clientHeight / 2) * 1.2 - canvasContainer.clientHeight / 2;
    }
    
    function zoomOut() {
        scale /= 1.2;
        scale = Math.max(scale, 0.1); // Min zoom level
        updateTransform();

        // Center the scroll position after zooming
        canvasContainer.scrollLeft = (canvasContainer.scrollLeft + canvasContainer.clientWidth / 2) / 1.2 - canvasContainer.clientWidth / 2;
        canvasContainer.scrollTop = (canvasContainer.scrollTop + canvasContainer.clientHeight / 2) / 1.2 - canvasContainer.clientHeight / 2;
    }
    
    function handleWheel(e) {
        e.preventDefault();
        
        // Zoom in or out based on wheel direction
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }
    
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    
    function startPan(e) {
        if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle mouse button or Ctrl+Left click
            e.preventDefault();
            isPanning = true;
            panStartX = e.clientX - offsetX;
            panStartY = e.clientY - offsetY;
            canvas.style.cursor = 'grabbing';
        }
    }
    
    function pan(e) {
        if (!isPanning) return;
        
        offsetX = e.clientX - panStartX;
        offsetY = e.clientY - panStartY;

        // Update scroll position instead of just offset
        canvasContainer.scrollLeft = -offsetX;
        canvasContainer.scrollTop = -offsetY;

        updateTransform();
    }
    
    function stopPan() {
        isPanning = false;
        updateCursor();
    }
    
    function updateTransform() {
        // Update offset based on scroll position
        offsetX = -canvasContainer.scrollLeft;
        offsetY = -canvasContainer.scrollTop;

        redrawCanvas();
        drawGrid();
        zoomLevelDisplay.textContent = `Zoom: ${Math.round(scale * 100)}%`;
    }
    
    // History management
    function undo() {
        if (drawings.length === 0) return;
        
        redoStack.push(drawings.pop());
        updateUndoRedoButtons();
        redrawCanvas();
    }
    
    function redo() {
        if (redoStack.length === 0) return;
        
        drawings.push(redoStack.pop());
        updateUndoRedoButtons();
        redrawCanvas();
    }
    
    function updateUndoRedoButtons() {
        undoBtn.disabled = drawings.length === 0;
        redoBtn.disabled = redoStack.length === 0;
    }
    
    // UI functions
    function toggleGrid() {
        showGrid = !showGrid;
        gridBtn.classList.toggle('active');
        drawGrid();
    }
    
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        themeBtn.classList.toggle('active');
        document.body.classList.toggle('dark-theme');
        
        // Update icon
        themeBtn.innerHTML = isDarkTheme ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
        
        // Redraw to update eraser strokes
        redrawCanvas();
    }
    
    function updateMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left - offsetX) / scale);
        const y = Math.round((e.clientY - rect.top - offsetY) / scale);
        mousePosition.textContent = `X: ${x}, Y: ${y}`;
    }
    
    // Download canvas
    function downloadCanvas() {
        // Create temporary canvas for download
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Find the bounding box of all drawings
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        
        drawings.forEach(drawing => {
            drawing.points?.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
            
            // Check text bounds
            if (drawing.tool === 'text') {
                const lines = drawing.text.split('\n');
                const lineHeight = drawing.fontSize;
                const textHeight = lines.length * lineHeight;
                const textWidth = Math.max(...lines.map(line => {
                    tempCtx.font = `${drawing.fontSize}px Arial`;
                    return tempCtx.measureText(line).width;
                }));
                
                minX = Math.min(minX, drawing.x);
                minY = Math.min(minY, drawing.y);
                maxX = Math.max(maxX, drawing.x + textWidth);
                maxY = Math.max(maxY, drawing.y + textHeight);
            }
        });
        
        // Add padding
        const padding = 20;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = maxX + padding;
        maxY = maxY + padding;
        
        // Check if there's content to download
        if (minX >= maxX || minY >= maxY || !isFinite(minX)) {
            alert('No content to download. Please draw something first.');
            return;
        }
        
        // Set temporary canvas size to bounding box
        const width = maxX - minX;
        const height = maxY - minY;
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        // Make the background transparent
        tempCtx.clearRect(0, 0, width, height);
        
        // Draw content to temporary canvas with offset
        tempCtx.translate(-minX, -minY);
        
        // Redraw all shapes
        drawings.forEach(drawing => {
            if (drawing.tool === 'pen' || drawing.tool === 'eraser') {
                // Draw line segments
                if (drawing.points.length < 2) return;
                
                tempCtx.beginPath();
                tempCtx.strokeStyle = drawing.tool === 'eraser' ? 'rgba(0,0,0,0)' : drawing.color;
                tempCtx.lineWidth = drawing.width;
                tempCtx.lineCap = 'round';
                tempCtx.lineJoin = 'round';
                
                tempCtx.moveTo(drawing.points[0].x, drawing.points[0].y);
                for (let i = 1; i < drawing.points.length; i++) {
                    tempCtx.lineTo(drawing.points[i].x, drawing.points[i].y);
                }
                tempCtx.stroke();
            } else if (drawing.tool === 'line') {
                // Draw line
                if (drawing.points.length < 2) return;
                
                tempCtx.beginPath();
                tempCtx.strokeStyle = drawing.color;
                tempCtx.lineWidth = drawing.width;
                tempCtx.lineCap = 'round';
                
                tempCtx.moveTo(drawing.points[0].x, drawing.points[0].y);
                tempCtx.lineTo(drawing.points[1].x, drawing.points[1].y);
                tempCtx.stroke();
            } else if (drawing.tool === 'arrow') {
                // Draw arrow
                if (drawing.points.length < 2) return;
                
                const fromX = drawing.points[0].x;
                const fromY = drawing.points[0].y;
                const toX = drawing.points[1].x;
                const toY = drawing.points[1].y;
                
                tempCtx.beginPath();
                tempCtx.strokeStyle = drawing.color;
                tempCtx.lineWidth = drawing.width;
                tempCtx.lineCap = 'round';
                
                // Line
                tempCtx.moveTo(fromX, fromY);
                tempCtx.lineTo(toX, toY);
                tempCtx.stroke();
                
                // Arrowhead
                const headLength = 15;
                const dx = toX - fromX;
                const dy = toY - fromY;
                const angle = Math.atan2(dy, dx);
                
                tempCtx.beginPath();
                tempCtx.moveTo(toX, toY);
                tempCtx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
                tempCtx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
                tempCtx.closePath();
                tempCtx.fillStyle = drawing.color;
                tempCtx.fill();
            } else if (drawing.tool === 'rectangle') {
                // Draw rectangle
                if (drawing.points.length < 2) return;
                
                const startX = drawing.points[0].x;
                const startY = drawing.points[0].y;
                const endX = drawing.points[1].x;
                const endY = drawing.points[1].y;
                const width = endX - startX;
                const height = endY - startY;
                
                tempCtx.beginPath();
                tempCtx.strokeStyle = drawing.color;
                tempCtx.lineWidth = drawing.width;
                tempCtx.rect(startX, startY, width, height);
                tempCtx.stroke();
            } else if (drawing.tool === 'circle') {
                // Draw circle
                if (drawing.points.length < 2) return;
                
                const centerX = drawing.points[0].x;
                const centerY = drawing.points[0].y;
                const pointX = drawing.points[1].x;
                const pointY = drawing.points[1].y;
                const radius = Math.sqrt(Math.pow(pointX - centerX, 2) + Math.pow(pointY - centerY, 2));
                
                tempCtx.beginPath();
                tempCtx.strokeStyle = drawing.color;
                tempCtx.lineWidth = drawing.width;
                tempCtx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                tempCtx.stroke();
            } else if (drawing.tool === 'text') {
                // Draw text
                tempCtx.font = `${drawing.fontSize}px Arial`;
                tempCtx.fillStyle = drawing.color;
                tempCtx.textBaseline = 'top';
                
                const lines = drawing.text.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    tempCtx.fillText(lines[i], drawing.x, drawing.y + i * drawing.fontSize);
                }
            }
        });
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'whiteboard.png';
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    }
    
    // Keyboard shortcuts
    function handleKeyboard(e) {
        if (textInputContainer.style.display === 'block') return;
        
        // Tool shortcuts
        switch(e.key.toLowerCase()) {
            case 'p':
                setActiveTool(penTool);
                break;
            case 'l':
                setActiveTool(lineTool);
                break;
            case 'a':
                setActiveTool(arrowTool);
                break;
            case 'r':
                setActiveTool(rectangleTool);
                break;
            case 'c':
                setActiveTool(circleTool);
                break;
            case 't':
                setActiveTool(textTool);
                break;
            case 'e':
                setActiveTool(eraserTool);
                break;
            case '+':
            case '=':
                zoomIn();
                break;
            case '-':
                zoomOut();
                break;
            case 'g':
                toggleGrid();
                break;
            case 'z':
                if (e.ctrlKey) {
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                }
                break;
            case 'y':
                if (e.ctrlKey) {
                    redo();
                }
                break;
        }
    }
    
    // Initialize app
    initCanvas();
    updateUndoRedoButtons();
});


textInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        applyText();
    }
});
