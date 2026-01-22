const canvas = document.getElementById('floorCanvas');
const ctx = canvas.getContext('2d');
const notesInput = document.getElementById('notesInput');

const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 720;
const TOKEN_RADIUS = 20;
const ARROW_LENGTH = 12;
const MOVE_STEP = 10;

const VALID_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const DIRECTION_ANGLES = {
    'N': -Math.PI / 2,
    'NE': -Math.PI / 4,
    'E': 0,
    'SE': Math.PI / 4,
    'S': Math.PI / 2,
    'SW': 3 * Math.PI / 4,
    'W': Math.PI,
    'NW': -3 * Math.PI / 4
};

// Track selection and drag state separately
let selectedLineNumber = null;
let isDragging = false;
let currentTokens = [];

function parseNotes(text) {
    const lines = text.split('\n');
    const tokens = [];

    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const parts = line.split(',').map(p => p.trim());

        if (parts.length < 3) return;

        const x = parseInt(parts[0], 10);
        const y = parseInt(parts[1], 10);
        const direction = parts[2].toUpperCase();

        if (isNaN(x) || isNaN(y) || x < 0 || y < 0) return;
        if (!VALID_DIRECTIONS.includes(direction)) return;

        tokens.push({ x, y, direction, lineNumber });
    });

    return tokens;
}

function transformY(y) {
    return CANVAS_HEIGHT - y;
}

function inverseTransformY(canvasY) {
    return CANVAS_HEIGHT - canvasY;
}

function drawFloor() {
    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawConnectingLine() {
    if (currentTokens.length < 2) return;

    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    for (let i = 0; i < currentTokens.length; i++) {
        const token = currentTokens[i];
        const canvasX = token.x;
        const canvasY = transformY(token.y);

        if (i === 0) {
            ctx.moveTo(canvasX, canvasY);
        } else {
            ctx.lineTo(canvasX, canvasY);
        }
    }
    ctx.stroke();
}

function drawToken(token, isSelected) {
    const canvasX = token.x;
    const canvasY = transformY(token.y);

    // Draw circle
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, TOKEN_RADIUS, 0, 2 * Math.PI);
    ctx.fillStyle = isSelected ? '#ffff99' : '#fff';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#ff0000' : '#000';
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.stroke();

    // Draw arrow
    const angle = DIRECTION_ANGLES[token.direction];
    const arrowStartX = canvasX;
    const arrowStartY = canvasY;
    const arrowEndX = canvasX + Math.cos(angle) * ARROW_LENGTH;
    const arrowEndY = canvasY + Math.sin(angle) * ARROW_LENGTH;

    ctx.beginPath();
    ctx.moveTo(arrowStartX, arrowStartY);
    ctx.lineTo(arrowEndX, arrowEndY);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw arrowhead
    const headLength = 6;
    const headAngle = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
        arrowEndX - headLength * Math.cos(angle - headAngle),
        arrowEndY - headLength * Math.sin(angle - headAngle)
    );
    ctx.moveTo(arrowEndX, arrowEndY);
    ctx.lineTo(
        arrowEndX - headLength * Math.cos(angle + headAngle),
        arrowEndY - headLength * Math.sin(angle + headAngle)
    );
    ctx.stroke();

    // Draw line number
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(token.lineNumber.toString(), canvasX, canvasY + TOKEN_RADIUS + 12);
}

function getSelectedToken() {
    if (selectedLineNumber === null) return null;
    return currentTokens.find(t => t.lineNumber === selectedLineNumber) || null;
}

function render() {
    currentTokens = parseNotes(notesInput.value);

    // Clear selection if the selected token no longer exists
    if (selectedLineNumber !== null && !currentTokens.find(t => t.lineNumber === selectedLineNumber)) {
        selectedLineNumber = null;
    }

    drawFloor();
    drawConnectingLine();
    currentTokens.forEach(token => {
        const isSelected = token.lineNumber === selectedLineNumber;
        drawToken(token, isSelected);
    });
}

function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function findTokenAtPosition(canvasX, canvasY) {
    // Check tokens in reverse order so topmost token is selected first
    for (let i = currentTokens.length - 1; i >= 0; i--) {
        const token = currentTokens[i];
        const tokenCanvasY = transformY(token.y);
        const dx = canvasX - token.x;
        const dy = canvasY - tokenCanvasY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= TOKEN_RADIUS) {
            return token;
        }
    }
    return null;
}

function updateTextareaLine(lineNumber, x, y, direction) {
    const lines = notesInput.value.split('\n');
    const lineIndex = lineNumber - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
        const originalLine = lines[lineIndex];
        const parts = originalLine.split(',');

        // Preserve any text after the third comma (comments)
        if (parts.length > 3) {
            // Find the position of the third comma
            let commaCount = 0;
            let thirdCommaIndex = -1;
            for (let i = 0; i < originalLine.length; i++) {
                if (originalLine[i] === ',') {
                    commaCount++;
                    if (commaCount === 3) {
                        thirdCommaIndex = i;
                        break;
                    }
                }
            }

            if (thirdCommaIndex !== -1) {
                const commentsSection = originalLine.substring(thirdCommaIndex + 1);
                lines[lineIndex] = `${x}, ${y}, ${direction},${commentsSection}`;
            } else {
                lines[lineIndex] = `${x}, ${y}, ${direction}`;
            }
        } else {
            lines[lineIndex] = `${x}, ${y}, ${direction}`;
        }
        notesInput.value = lines.join('\n');
    }
}

function insertTextareaLine(afterLineNumber, x, y, direction) {
    const lines = notesInput.value.split('\n');
    const lineIndex = afterLineNumber; // Insert after this line (0-based index)
    const newLine = `${x}, ${y}, ${direction}`;
    lines.splice(lineIndex, 0, newLine);
    notesInput.value = lines.join('\n');
}

function appendTextareaLine(x, y, direction) {
    const newLine = `${x}, ${y}, ${direction}`;
    if (notesInput.value.trim() === '') {
        notesInput.value = newLine;
    } else {
        notesInput.value += '\n' + newLine;
    }
}

function deleteTextareaLine(lineNumber) {
    const lines = notesInput.value.split('\n');
    const lineIndex = lineNumber - 1;
    if (lineIndex >= 0 && lineIndex < lines.length) {
        lines.splice(lineIndex, 1);
        notesInput.value = lines.join('\n');
    }
}

function rotateDirection(currentDirection, clockwise) {
    const index = VALID_DIRECTIONS.indexOf(currentDirection);
    if (index === -1) return currentDirection;
    const newIndex = clockwise
        ? (index + 1) % VALID_DIRECTIONS.length
        : (index - 1 + VALID_DIRECTIONS.length) % VALID_DIRECTIONS.length;
    return VALID_DIRECTIONS[newIndex];
}

function selectNextToken(forward) {
    if (currentTokens.length === 0) return;

    if (selectedLineNumber === null) {
        // Select first token if nothing selected
        selectedLineNumber = currentTokens[0].lineNumber;
    } else {
        // Find current index in tokens array
        const currentIndex = currentTokens.findIndex(t => t.lineNumber === selectedLineNumber);
        if (currentIndex === -1) {
            selectedLineNumber = currentTokens[0].lineNumber;
        } else {
            // Move to next/previous with circular wrap
            const newIndex = forward
                ? (currentIndex + 1) % currentTokens.length
                : (currentIndex - 1 + currentTokens.length) % currentTokens.length;
            selectedLineNumber = currentTokens[newIndex].lineNumber;
        }
    }
    render();
}

function addToken() {
    let newX, newY;
    const newDirection = 'N';

    if (selectedLineNumber === null) {
        // No token selected - add to end of list
        if (currentTokens.length === 0) {
            // No tokens at all - add at center
            newX = 200;
            newY = 300;
        } else {
            // Add above the last token
            const lastToken = currentTokens[currentTokens.length - 1];
            newX = lastToken.x;
            newY = lastToken.y + 50;
        }
        appendTextareaLine(newX, newY, newDirection);
        render();
        // Select the newly added token (it will be at the end)
        if (currentTokens.length > 0) {
            selectedLineNumber = currentTokens[currentTokens.length - 1].lineNumber;
        }
    } else {
        // Token is selected - insert after it
        const token = getSelectedToken();
        if (token) {
            newX = token.x;
            newY = token.y + 50;
            insertTextareaLine(token.lineNumber, newX, newY, newDirection);
            render();
            // Select the newly inserted token (it will be at selectedLineNumber + 1)
            selectedLineNumber = token.lineNumber + 1;
        }
    }
    render();
}

function deleteToken() {
    if (selectedLineNumber === null) return;

    deleteTextareaLine(selectedLineNumber);
    selectedLineNumber = null;
    render();
}

// Mouse events
canvas.addEventListener('mousedown', (event) => {
    const coords = getCanvasCoords(event);
    const token = findTokenAtPosition(coords.x, coords.y);

    if (token) {
        if (selectedLineNumber === token.lineNumber) {
            // Clicking on already selected token - start dragging
            isDragging = true;
            canvas.style.cursor = 'grabbing';
        } else {
            // Clicking on a different token - select it
            selectedLineNumber = token.lineNumber;
            isDragging = true;
            canvas.style.cursor = 'grabbing';
        }
        render();
    } else {
        // Clicking on empty space - deselect
        if (selectedLineNumber !== null) {
            selectedLineNumber = null;
            render();
        }
    }
});

canvas.addEventListener('mousemove', (event) => {
    const coords = getCanvasCoords(event);

    if (isDragging && selectedLineNumber !== null) {
        const token = getSelectedToken();
        if (token) {
            const newX = Math.max(0, Math.round(coords.x));
            const newY = Math.max(0, Math.round(inverseTransformY(coords.y)));
            updateTextareaLine(token.lineNumber, newX, newY, token.direction);
            render();
        }
    } else {
        // Change cursor when hovering over a token
        const token = findTokenAtPosition(coords.x, coords.y);
        canvas.style.cursor = token ? 'grab' : 'default';
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    const coords = { x: -1, y: -1 }; // Will result in no token found
    canvas.style.cursor = 'default';
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
    canvas.style.cursor = 'default';
});

// Keyboard events
document.addEventListener('keydown', (event) => {
    // Don't intercept keys when typing in textarea
    if (document.activeElement === notesInput) {
        return;
    }

    const token = getSelectedToken();

    // Tab / Shift+Tab for cycling selection
    if (event.key === 'Tab') {
        event.preventDefault();
        selectNextToken(!event.shiftKey);
        return;
    }

    // 'a' key to add a new token
    if (event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        addToken();
        return;
    }

    // 'x' key to delete selected token
    if (event.key === 'x' || event.key === 'X') {
        event.preventDefault();
        deleteToken();
        return;
    }

    // Arrow keys require a selected token
    if (!token) return;

    // Shift+Arrow for rotation
    if (event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) {
        event.preventDefault();
        const clockwise = event.key === 'ArrowRight';
        const newDirection = rotateDirection(token.direction, clockwise);
        updateTextareaLine(token.lineNumber, token.x, token.y, newDirection);
        render();
        return;
    }

    // Arrow keys for movement
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        let newX = token.x;
        let newY = token.y;

        switch (event.key) {
            case 'ArrowUp':    newY += MOVE_STEP; break;
            case 'ArrowDown':  newY -= MOVE_STEP; break;
            case 'ArrowLeft':  newX -= MOVE_STEP; break;
            case 'ArrowRight': newX += MOVE_STEP; break;
        }

        // Clamp to non-negative values
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);

        updateTextareaLine(token.lineNumber, newX, newY, token.direction);
        render();
    }
});

notesInput.addEventListener('input', render);

// Initial render
render();
