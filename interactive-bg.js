// interactive-bg.js

// ==== CONFIGURABLE SETTINGS ====
const CONFIG = {
    dotCount: 120,                // Number of dots
    maxConnectionDistance: 200,   // Distance for connecting lines
    dotRadius: 2,                  // Radius of each dot
    glowIntensity: 15,             // Glow blur size
    connectionDelay: 250,          // ms delay for line formation
    dotSpeed: 0.3,                  // Dot movement speed
    gradientColors: ["#0b1e33", "#001122"], // Background gradient
    dropletHighlight: false,        // Simulate water droplet sparkle
    dropletGlowColor: "rgba(100, 200, 255, 0.8)"
};

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");
document.body.prepend(canvas);

let width, height, dots, mouse;
function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==== CREATE DOTS ====
function createDots() {
    dots = [];
    for (let i = 0; i < CONFIG.dotCount; i++) {
        dots.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * CONFIG.dotSpeed,
            vy: (Math.random() - 0.5) * CONFIG.dotSpeed,
            lastConnected: 0
        });
    }
}
createDots();

mouse = { x: null, y: null, active: false };

function setMouse(x, y) {
    mouse.x = x;
    mouse.y = y;
    mouse.active = true;
}
function clearMouse() {
    mouse.active = false;
}

// ==== EVENT LISTENERS ====
window.addEventListener("mousemove", e => setMouse(e.clientX, e.clientY));
window.addEventListener("touchmove", e => {
    const t = e.touches[0];
    setMouse(t.clientX, t.clientY);
}, { passive: true });
window.addEventListener("mouseleave", clearMouse);
window.addEventListener("touchend", clearMouse);

// ==== DRAW BACKGROUND ====
function drawGradientBackground() {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, CONFIG.gradientColors[0]);
    gradient.addColorStop(1, CONFIG.gradientColors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
}

// ==== UPDATE DOTS ====
function updateDots() {
    for (let d of dots) {
        d.x += d.vx;
        d.y += d.vy;

        if (d.x < 0 || d.x > width) d.vx *= -1;
        if (d.y < 0 || d.y > height) d.vy *= -1;
    }
}

// ==== DRAW DOTS ====
function drawDots() {
    for (let d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, CONFIG.dotRadius, 0, Math.PI * 2);

        // Glow effect
        ctx.shadowBlur = CONFIG.glowIntensity;
        ctx.shadowColor = CONFIG.dropletGlowColor;

        ctx.fillStyle = "rgba(150, 220, 255, 0.9)";
        ctx.fill();

        // Optional water droplet sparkle
        if (CONFIG.dropletHighlight && Math.random() < 0.003) {
            ctx.beginPath();
            ctx.arc(d.x + Math.random(), d.y - Math.random(), CONFIG.dotRadius / 1.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fill();
        }
    }
}

// ==== DRAW CONNECTIONS ====
function drawConnections() {
    for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
            const dx = dots[i].x - dots[j].x;
            const dy = dots[i].y - dots[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < CONFIG.maxConnectionDistance) {
                const now = Date.now();
                if (now - dots[i].lastConnected > CONFIG.connectionDelay) {
                    ctx.beginPath();
                    ctx.moveTo(dots[i].x, dots[i].y);
                    ctx.lineTo(dots[j].x, dots[j].y);
                    ctx.strokeStyle = `rgba(120, 200, 255, ${1 - dist / CONFIG.maxConnectionDistance})`;
                    ctx.lineWidth = 0.8;
                    ctx.shadowBlur = CONFIG.glowIntensity / 2;
                    ctx.shadowColor = CONFIG.dropletGlowColor;
                    ctx.stroke();
                    dots[i].lastConnected = now;
                }
            }
        }
    }

    // Cursor temporary lines
    if (mouse.active) {
        for (let d of dots) {
            const dx = mouse.x - d.x;
            const dy = mouse.y - d.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < CONFIG.maxConnectionDistance * 1.2) {
                ctx.beginPath();
                ctx.moveTo(mouse.x, mouse.y);
                ctx.lineTo(d.x, d.y);
                ctx.strokeStyle = `rgba(150, 220, 255, ${1 - dist / (CONFIG.maxConnectionDistance * 1.2)})`;
                ctx.lineWidth = 1;
                ctx.shadowBlur = CONFIG.glowIntensity;
                ctx.shadowColor = CONFIG.dropletGlowColor;
                ctx.stroke();
            }
        }
    }
}

// ==== ANIMATE ====
function animate() {
    drawGradientBackground();
    updateDots();
    drawConnections();
    drawDots();
    requestAnimationFrame(animate);
}
animate();
