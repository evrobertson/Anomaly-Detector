// Global variable to store detected coordinates
let detectedCoords = [];

// Initialize event listeners and image selection
document.addEventListener("DOMContentLoaded", init);

function init() {
    init_image_select();
}

// Set up image upload and display it on the canvas
function init_image_select() {
    let image_selector = document.getElementById("image-input");
    let image_container = document.getElementById("photo");
    let canvas = document.getElementById("canvas");

    image_selector.addEventListener("change", (event) => {
        let photo = event.target.files[0];
        if (photo) {
            let reader = new FileReader();
            reader.onload = function(e) {
                image_container.src = e.target.result;
                image_container.onload = function() {
                    canvas.width = image_container.width;
                    canvas.height = image_container.height;
                    canvas.style.display = 'block';
                    console.log("Image loaded and canvas dimensions set.");
                };
            };
            reader.readAsDataURL(photo);
        }
    });
}

// Calculate average background color of the image
function calculateBackgroundColor(imageData) {
    let totalR = 0, totalG = 0, totalB = 0;
    const pixelCount = imageData.data.length / 4;

    for (let i = 0; i < imageData.data.length; i += 4) {
        totalR += imageData.data[i];
        totalG += imageData.data[i + 1];
        totalB += imageData.data[i + 2];
    }

    return {
        r: totalR / pixelCount,
        g: totalG / pixelCount,
        b: totalB / pixelCount
    };
}

// Calculate distance between two points
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

// Detect anomalies of a specific color
function detectAnomalies(color) {
    let image = document.getElementById('photo');
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    if (!image.complete || canvas.width === 0 || canvas.height === 0) {
        console.log("Image not fully loaded or canvas not set up.");
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const backgroundColor = calculateBackgroundColor(imageData);
    const brightness = (backgroundColor.r + backgroundColor.g + backgroundColor.b) / 3;
    const generalThreshold = brightness > 128 ? 80 : 100;
    detectedCoords = [];
    const coordinatesList = document.getElementById("coordinates-list");
    coordinatesList.innerHTML = '';

    const margin = 20;
    const minDistance = 10;

    for (let i = 0; i < imageData.data.length; i += 4) {
        let pixelIndex = i / 4;
        let x = pixelIndex % canvas.width;
        let y = Math.floor(pixelIndex / canvas.width);

        if (x < margin || x > canvas.width - margin || y < margin || y > canvas.height - margin) continue;

        let r = imageData.data[i];
        let g = imageData.data[i + 1];
        let b = imageData.data[i + 2];

        let colorDifference = Math.sqrt(
            Math.pow(r - backgroundColor.r, 2) +
            Math.pow(g - backgroundColor.g, 2) +
            Math.pow(b - backgroundColor.b, 2)
        );

        if (colorDifference > generalThreshold) {
            let isAnomaly = false;
            switch (color) {
                case 'yellow': isAnomaly = (r > g && g > b); break;
                case 'red': isAnomaly = (r > g && r > b); break;
                case 'green': isAnomaly = (g > r && g > b); break;
                case 'blue': isAnomaly = (b > r && b > g); break;
            }

            if (isAnomaly) {
                let isTooClose = detectedCoords.some(coord => calculateDistance(coord.x, coord.y, x, y) < minDistance);
                
                if (!isTooClose) {
                    let anomalyIndex = detectedCoords.length;
                    detectedCoords.push({ x, y, anomalyIndex });

                    let listItem = document.createElement("li");
                    listItem.textContent = `(${x}, ${y})`;
                    listItem.dataset.anomalyIndex = anomalyIndex;
                    listItem.classList.add("clickable-coordinate");
                    listItem.addEventListener("click", () => showColorDifference(x, y));
                    listItem.addEventListener("click", () => highlightAnomaly(anomalyIndex));
                    coordinatesList.appendChild(listItem);

                    drawCircle(ctx, x, y, "red", 3);
                }
            }
        }
    }
}

// Draw a circle on the canvas at the specified coordinates
function drawCircle(ctx, x, y, color, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Highlight a selected anomaly by drawing a yellow circle over it
function highlightAnomaly(anomalyIndex) {
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');
    let image = document.getElementById('photo');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    if (anomalyIndex < 0 || anomalyIndex >= detectedCoords.length) {
        console.error("Invalid anomalyIndex:", anomalyIndex);
        return;
    }

    let selectedCoord = detectedCoords[anomalyIndex];
    drawCircle(ctx, selectedCoord.x, selectedCoord.y, "yellow", 5);
}
// Function to calculate and display color difference between anomaly and background in an info box
function showColorDifference(x, y) {
    // Get the canvas and its drawing context
    let canvas = document.getElementById('canvas');
    let ctx = canvas.getContext('2d');

    // Get the RGB values of the selected anomaly pixel
    let imageData = ctx.getImageData(x, y, 1, 1).data;
    let anomalyColor = { r: imageData[0], g: imageData[1], b: imageData[2] };

    // Calculate background color using an existing function
    let backgroundColor = calculateBackgroundColor(ctx.getImageData(0, 0, canvas.width, canvas.height));

    // Calculate the Euclidean color distance between anomaly and background
    let colorDifference = Math.sqrt(
        Math.pow(anomalyColor.r - backgroundColor.r, 2) +
        Math.pow(anomalyColor.g - backgroundColor.g, 2) +
        Math.pow(anomalyColor.b - backgroundColor.b, 2)
    );

    // Get the info box and set its content
    let infoBox = document.getElementById("info-box");
    let infoBoxContent = document.getElementById("info-box-content");

    // Set the color difference information as the content of the info box
    infoBoxContent.innerHTML = `
        <strong>Color Difference:</strong> ${colorDifference.toFixed(2)}<br>
        <strong>Anomaly RGB:</strong> (${anomalyColor.r}, ${anomalyColor.g}, ${anomalyColor.b})<br>
        <strong>Background RGB:</strong> (${backgroundColor.r.toFixed(2)}, ${backgroundColor.g.toFixed(2)}, ${backgroundColor.b.toFixed(2)})
    `;

    // Display the info box
    infoBox.style.display = 'block';
}



// Global variable to track tooltip visibility
let showCoordinates = false;

// Initialize the coordinate tooltip and add it to the body
const tooltip = document.createElement("div");
tooltip.id = "coordinate-tooltip";
document.body.appendChild(tooltip);

// Toggle the coordinate display based on checkbox
function toggleCoordinateDisplay() {
    showCoordinates = document.getElementById("toggle-coordinates").checked;
    tooltip.style.display = showCoordinates ? 'block' : 'none';
}

// Display coordinates when mouse moves over the canvas
function showCoordinatesOnHover() {
    const canvas = document.getElementById("canvas");

    canvas.addEventListener("mousemove", (event) => {
        if (!showCoordinates) return; // Only show tooltip if checkbox is checked

        // Get mouse position relative to the canvas
        const rect = canvas.getBoundingClientRect();
        const x = Math.round(event.clientX - rect.left);
        const y = Math.round(event.clientY - rect.top);

        // Update tooltip position and text
        tooltip.style.left = `${event.pageX + 10}px`; // Position slightly to the right of cursor
        tooltip.style.top = `${event.pageY + 10}px`;
        tooltip.textContent = `X: ${x}, Y: ${y}`;
        tooltip.style.display = 'block';
    });

    // Hide tooltip when mouse leaves the canvas
    canvas.addEventListener("mouseleave", () => {
        tooltip.style.display = 'none';
    });
}

// Call function to activate coordinate display on hover
showCoordinatesOnHover();

// Event listener to close the info box
document.getElementById("info-box-close").addEventListener("click", function() {
    document.getElementById("info-box").style.display = 'none';
});