const RENDER_API_ENDPOINT = "https://the-deep-dive-api.onrender.com" + "/classify";
const FIREBASE_URL = "https://the-deep-dive-0-default-rtdb.firebaseio.com" + "/reflections.json";

// --- Typography ---
const TITLE_FONT = 'serif';
const BODY_FONT = 'serif';

const TITLE_SIZE = 16;
const QUESTION_SIZE = 16;
const INSTRUCTION_SIZE = 14;
const RESULT_LABEL_SIZE = 12;
const REFLECTION_TITLE_SIZE = 28;
const ARCHIVE_TITLE_SIZE = 32;
const LOADING_TITLE_SIZE = 30;

// --- Global Variables for State Management ---
let state = 'QUESTION'; // Controls which question/screen is visible ('QUESTION', 'LOADING', 'RESULTS')
let currentQuestionIndex = 0;
let userResponses = [];
let aestheticResults = null;
let inputElement; // P5.js input element (the textbox)
let loadingAngle = 0; // For the spinner animation

// -- Variables for Navigation Buttons ---
let backButton;
let nextButton;
let restartButton;

// Archive for Mesh
let archiveData = [];
let meshParticles = [];

// Color Transition Variables
let currentColor;
let lightBg;
let darkBg;

const QUESTIONS = [
    "you are walking into a cafe, what are you ordering?",
    "what are you wearing today?",
    "it is friday night, what are you most likely doing in this moment?",
    "pretend you are at your favorite restaurant. where are you, and what are you ordering?",
    "tell me about your favorite social media platform and talk about your favorite creator. \nif you don't like social media, tell me why or what else you consume."
];

function setup() {
    // Create the canvas to fill the entire window
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('app-container'); // Attach canvas to the main container
    
    // Initialize Colors
    lightBg = color(220, 220, 230);
    darkBg = color(20, 20, 25);
    currentColor = lightBg;

    // Set up text styles
    textSize(24);
    textAlign(CENTER, CENTER);
    textFont('serif');
    
    // Create the initial input box
    inputElement = createInput('');
    inputElement.size(500, 40);
    inputElement.style('font-size', '16px');
    inputElement.style('font-family', 'serif');
    inputElement.style('padding', '5px');
    inputElement.style('border', 'none');
    inputElement.style('background', 'rgba(100, 100, 100, 0.5)'); // Semi-transparent dark background
    inputElement.style('color', 'white');
    inputElement.style('outline', 'none');
    inputElement.style('z-index', '10'); // CRITICAL: Ensure input is above the canvas

    // Start the process by setting the state and position
    state = 'QUESTION';
    positionInput();

    // WAKE UP CALL: Sends a dummy request to Render immediately 
    // so it's awake by the time the user finishes the 5th question.
    fetch(RENDER_API_ENDPOINT, { 
        method: 'POST', 
        body: JSON.stringify({ responses: ["wake up"] }) 
    }).catch(e => console.log("Waking up server..."));

    // Initial fetch of the archive for the "moving mesh"
    fetchArchive();

    // Navigation controls
    backButton = select('#back-btn');
    nextButton = select('#next-btn');
    restartButton = select('#restart-btn');

    backButton.mousePressed(handleBack);
    nextButton.mousePressed(handleNext);
    restartButton.mousePressed(restartExperience);

    updateNavButtons();
}

function updateNavButtons() {
    if (!backButton || !nextButton || !restartButton) return;

    // show everything by default
    backButton.show();
    nextButton.show();
    restartButton.show();

    // enable everything by default
    backButton.removeAttribute('disabled');
    nextButton.removeAttribute('disabled');
    restartButton.removeAttribute('disabled');

    if (state === 'QUESTION') {
        if (currentQuestionIndex === 0) {
            backButton.attribute('disabled', true);
        }
    }

    if (state === 'LOADING') {
        backButton.attribute('disabled', true);
        nextButton.attribute('disabled', true);
    }

    if (state === 'RESULTS') {
        // no going back to questions after results
        backButton.attribute('disabled', true);
    }

    if (state === 'REFLECT') {
        // can go back to pie chart, but not forward
        nextButton.attribute('disabled', true);
    }

    if (state === 'ARCHIVE') {
        // archive screen only has restart
        backButton.hide();
        nextButton.hide();
    }
}

function handleNext() {
    if (state === 'QUESTION') {
        processAnswer();
    } 
    
    else if (state === 'RESULTS') {
        state = 'REFLECT';
        updateNavButtons();
    }
}

function handleBack() {
    if (state === 'QUESTION' && currentQuestionIndex > 0) {
        currentQuestionIndex--;
        inputElement.value(userResponses[currentQuestionIndex] || '');
        userResponses = userResponses.slice(0, currentQuestionIndex);
    } 
    
    else if (state === 'REFLECT') {
        state = 'RESULTS';
        inputElement.value('');
        inputElement.position(-1000, -1000);
    }

    updateNavButtons();
}

function restartExperience() {
    state = 'QUESTION';
    currentQuestionIndex = 0;
    userResponses = [];
    aestheticResults = null;
    inputElement.value('');
    positionInput();
    updateNavButtons();
}

function applyShadow() {
    drawingContext.shadowColor = 'rgba(0,0,0,0.6)';
    drawingContext.shadowBlur = 12;
    drawingContext.shadowOffsetX = 0;
    drawingContext.shadowOffsetY = 0;
}

function draw() {
    // Only go dark for REFLECT (That's you, right?) and ARCHIVE (The Mesh)
    let isDarkState = (state === 'RESULTS' || state === 'REFLECT' || state === 'ARCHIVE');
    let target = isDarkState ? darkBg : lightBg;

    // Smooth transition
    currentColor = lerpColor(currentColor, target, 0.05);

    // 1. Draw the Background
    drawEtherealBackground(currentColor);

    // 2. GLOBAL HEADERS (Consistent on ALL screens)
    push();
    fill(255);
    textAlign(CENTER, CENTER);
    textFont(TITLE_FONT);
    textSize(TITLE_SIZE); // Standard size matching the instructions/questions
    
    // Positioned exactly the same on every screen
    text("who are you?", width / 2, height / 2 - 200);
    text("The Deep Dive", width / 2, height - 90);
    pop();

    // 3. Handle the current state (Question, Loading, or Results)
    switch (state) {
        case 'QUESTION':
            drawQuestionScreen();
            break;
        case 'LOADING':
            drawLoadingScreen();
            break;
        case 'RESULTS':
            drawPieChartScreen();
            break;
        case 'REFLECT':
            drawReflectionScreen();
            break;
        case 'ARCHIVE':
            drawArchiveMesh();
            break;
    }
    updateNavButtons();
}

// --- 1. THE PIE CHART (Results) ---
function drawPieChartScreen() {
    // Only proceed if we are actually in the RESULTS state
    if (state !== 'RESULTS') return;

    inputElement.position(-1000, -1000); 
    cursor(ARROW); // Keeps the mouse cursor as a normal pointer
    
    let centerX = width / 2;
    let centerY = height / 2;
    let diameter = 280; // Smaller to prevent overlap
    let lastAngle = 0;

    // Instruction ABOVE the pie chart
    push();
    applyShadow();
    fill(255, 180);
    textFont(BODY_FONT);
    textSize(INSTRUCTION_SIZE);
    textAlign(CENTER, CENTER);
    // Positioned above the chart (centerY - chart radius - extra padding)
    text("click next to continue", width / 2, centerY - 180);
    pop();

    if (aestheticResults) {
        let results = Object.entries(aestheticResults);
        
        results.forEach(([label, percent], i) => {
            let angle = map(percent, 0, 100, 0, TWO_PI);
            
            // Calculate endAngle and force the last slice to close the gap
            let endAngle = lastAngle + angle;
            if (i === results.length - 1) {
                endAngle = TWO_PI;
            }

            // Draw the Slice
            // Slightly more transparent slices to look better on the darkening background
            fill(150, 180, 200 + (i * 10), 180);
            stroke(255, 30);
            arc(centerX, centerY, diameter, diameter, lastAngle, endAngle, PIE);

            // Hover Logic
            let mouseAngle = atan2(mouseY - centerY, mouseX - centerX);
            if (mouseAngle < 0) mouseAngle += TWO_PI;
            
            let d = dist(mouseX, mouseY, centerX, centerY);
            if (d < diameter/2 && mouseAngle > lastAngle && mouseAngle < endAngle) {
                
                // Position text inside the slice
                let midAngle = lastAngle + (endAngle - lastAngle) / 2;
                let textOffset = diameter * 0.3; 
                let tx = centerX + cos(midAngle) * textOffset;
                let ty = centerY + sin(midAngle) * textOffset;

                noStroke();
                fill(255);
                textFont(BODY_FONT);
                textSize(RESULT_LABEL_SIZE);
                textAlign(CENTER, CENTER);
                text(`${label.toUpperCase()}\n${percent}%`, tx, ty);
            }
            
            // Update lastAngle for the next iteration
            lastAngle = endAngle;
        });
    }
}

/* --- THE CLICK HANDLER ---
function mousePressed() {
    // If the user is on the Results screen, clicking moves them to Reflection
    if (state === 'RESULTS') {
        state = 'REFLECT';
        updateNavButtons();
    }
}
*/

// --- 2. THE REFLECTION ("That's you, right?") ---
function drawReflectionScreen() {
    positionInput();
    push();
    applyShadow();
    fill(255);
    textAlign(CENTER, CENTER);
    textFont(TITLE_FONT);
    textSize(REFLECTION_TITLE_SIZE); 
    text("that's you, right?", width / 2, height / 2 - 60);
    
    textSize(INSTRUCTION_SIZE);
    // Splitting this instruction text to avoid a long horizontal line
    text("Type your reflection and press ENTER\nto archive your identity", width / 2, height / 2 + 100);
    pop();
}

// --- 3. THE MOVING MESH ---
function drawArchiveMesh() {
    inputElement.position(-1000, -1000);
    
    push();
    applyShadow();
    textAlign(CENTER, CENTER); // Force centering
    fill(255, 200);
    textFont(BODY_FONT);
    textSize(ARCHIVE_TITLE_SIZE);
    text("The Collective Archive", width / 2, height / 2);
    pop();
    
    meshParticles.forEach(p => {
        p.update();
        p.display();
    });
}

// --- Firebase & Logic ---
async function fetchArchive() {
    try {
        let response = await fetch(FIREBASE_URL);
        let data = await response.json();
        if (data) {
            archiveData = Object.values(data).map(obj => obj.reflection);
            // Create particles for each archived reflection
            meshParticles = archiveData.map(txt => new Particle(txt));
        }
    } catch (e) { console.error("Archive fetch failed", e); }
}

async function saveToFirebase(reflection) {
    const payload = {
        reflection: reflection,
        timestamp: Date.now(),
        top_aesthetic: Object.keys(aestheticResults)[0]
    };
    
    // Switch state immediately for a "fast" feel
    state = 'ARCHIVE'; 
    updateNavButtons();

    try {
        await fetch(FIREBASE_URL, { 
            method: 'POST', 
            body: JSON.stringify(payload) 
        });
        // Update the mesh in the background
        fetchArchive(); 
    } catch (e) { 
        console.error("Firebase save failed", e); 
    }
}

// Function to handle the transition to the next step when ENTER is pressed
function keyPressed() {
    // 1. Logic for the Quiz Phase
    if (keyCode === ENTER && state === 'QUESTION') {
        processAnswer();
    } 
    
    // 2. Logic for the Reflection Phase (NEW)
    else if (keyCode === ENTER && state === 'REFLECT') {
        const reflection = inputElement.value();
        if (reflection.trim() !== '') {
            // Send to database
            saveToFirebase(reflection);
            
            // Clean up UI for the final mesh
            inputElement.value('');
            inputElement.position(-1000, -1000); 
        }
    }
}

// Particle class for the "Moving Mesh"
class Particle {
    constructor(txt) {
        this.txt = txt;
        this.pos = createVector(random(width), random(height));
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.noiseSeed = random(1000);
    }
    update() {
        this.pos.add(this.vel);
        if (this.pos.x < 0 || this.pos.x > width) this.vel.x *= -1;
        if (this.pos.y < 0 || this.pos.y > height) this.vel.y *= -1;
    }
    display() {
        fill(255, 120);
        textSize(BODY_FONT);
        text(this.txt, this.pos.x, this.pos.y);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    positionInput();
}

// Helper to center the input box
function positionInput() {
    // closer to the question text
    inputElement.position(width / 2 - inputElement.width / 2, height / 2 + 10);
}

// --- Drawing the Background (Ethereal Visuals) ---
function drawEtherealBackground(bgCol) {
    background(bgCol || lightBg); // Use the passed color or default to light
    
    noStroke();
    for (let i = 0; i < 100; i++) {
        // Subtle transparency adjustment for dark mode
        let alphaVal = (state === 'QUESTION' || state === 'LOADING') ? 10 : 5;
        fill(255, 255, 255, alphaVal);
        ellipse(
            noise(i * 0.1, frameCount * 0.005) * width, 
            noise(i * 0.2, frameCount * 0.007) * height, 
            map(i, 0, 100, 50, 300)
        );
    }
}

// --- Drawing the Question Screen ---
function drawQuestionScreen() {
    positionInput();
    // Ensure input stays positioned near the question
    // Use the canvas 2D context shadow properties for a soft, blurred shadow
    // Save/restore drawing context around shadow changes so other elements aren't affected

    // Question text (larger)
    textSize(QUESTION_SIZE);
    if (drawingContext && drawingContext.save) drawingContext.save();
    // Soft black shadow behind white text
    applyShadow();
    fill(255); // White text
    text(QUESTIONS[currentQuestionIndex], width / 2, height / 2 - 50);

    // Restore drawing context so subsequent drawings are not blurred
    if (drawingContext && drawingContext.restore) drawingContext.restore();

    // Instruction text (smaller) — use a slightly smaller shadow blur
    textSize(INSTRUCTION_SIZE);
    if (drawingContext && drawingContext.save) drawingContext.save();
    applyShadow();
    fill(255);
    text("Press ENTER to submit", width / 2, height / 2 + 100);

    if (drawingContext && drawingContext.restore) drawingContext.restore();
}


// --- Drawing the Loading Screen ---
function drawLoadingScreen() {
    // Hide the input box by moving it off-screen
    inputElement.position(-1000, -1000); 
    
    fill(255);
    textSize(LOADING_TITLE_SIZE);
    textFont(TITLE_FONT);
    text("you are....", width / 2, height / 2 - 50);
    
    // Draw the spinning circle loader
    push();
    translate(width / 2, height / 2);
    stroke(255);
    strokeWeight(3);
    noFill();
    
    for (let i = 0; i < 8; i++) {
        let angle = loadingAngle + (i * PI / 4);
        let x = cos(angle) * 15;
        let y = sin(angle) * 15;
        
        let alpha = map(sin(loadingAngle + i * PI / 4), -1, 1, 100, 255);
        fill(255, alpha);
        ellipse(x, y, 6, 6);
    }
    
    loadingAngle += 0.1; // Speed of rotation
    pop();
}


// --- Drawing the Results Screen ---
/* function drawResultsScreen() {
    // Hide the input box by moving it off-screen
    inputElement.position(-1000, -1000); 
    
    fill(255);
    textSize(30);
    text("you are....", width / 2, height / 2 - 100);
    
    if (aestheticResults) {
        textSize(24);
        let resultString = '';
        
        // Build the result string (e.g., "20% clean girl, 40% Y2K...")
        Object.entries(aestheticResults).forEach(([aesthetic, percentage], index) => {
            if (index > 0) resultString += ', ';
            resultString += `${percentage}% ${aesthetic.toUpperCase()}`;
        });
        
        // Draw the result string
        text(resultString, width / 2, height / 2);
    }
}
*/

// --- Logic for moving between states ---
function processAnswer() {
    const answer = inputElement.value();
    if (answer.trim() === '') return; // Don't submit empty answers
    
    userResponses.push(answer);
    inputElement.value(''); // Clear the input box
    
    currentQuestionIndex++;
    
    if (currentQuestionIndex < QUESTIONS.length) {
        // Move to the next question
    } else {
        // All questions answered, time to move to loading and API call
        state = 'LOADING';
        processResults(userResponses);
    }
}

// --- API Integration ---
async function processResults(responses) {
    console.log("Sending data to Render..."); // Trace the start
    try {
        const response = await fetch(RENDER_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ responses: responses })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        aestheticResults = await response.json(); 
        console.log("Data received:", aestheticResults); // Trace the end
        state = 'RESULTS'; 

    } catch (error) {
        console.error('API Error:', error);
        // Fallback so the user isn't stuck forever
        aestheticResults = { 'ERROR': 100 };
        state = 'RESULTS';
    }
}