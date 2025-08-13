// interactive-bg.js

// ====== CONFIG ======
const CONFIG = {
    pointCount: 80,        // Number of points/droplets
    maxDistance: 160,      // Max distance for connecting lines
    connectionDelay: 300,  // Delay in ms for line formation
    dropletSize: 3,        // Radius of droplets
    dropletGlow: 8,        // Glow radius
    webColor: 'rgba(255, 255, 255, 0.6)', // Web/line color
    dropletColor: '#aee4ff', // Droplet glow color
    atmosphereColor: 'rgba(173, 216, 230, 0.05)', // Mist/halo
    pointSpeed: 0.3,       // Movement speed
    responsive: true       // Adjust point count for smaller screens
};

const canvas = document.getElementById('interactive-bg');
const ctx = canvas.getContext('2d');

let points = [];
let mouse = { x: null, y: null, active: false };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (CONFIG.responsive) {
        CONFIG.pointCount = Math.floor(window.innerWidth / 20);
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Create a point/droplet
function createPoint(x, y) {
    return {
        x: x || Math.random() * canvas.width,
        y: y || Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * CONFIG.pointSpeed,
        vy: (Math.random() - 0.5) * CONFIG.pointSpeed,
        connectTime: Date.now() + Math.random() * CONFIG.connectionDelay
    };
}

// Init points
for (let i = 0; i < CONFIG.pointCount; i++) {
    points.push(createPoint());
}

// Mouse/touch interaction
function updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    mouse.y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    mouse.active = true;
}
function disableMouse() {
    mouse.active = false;
}
window.addEventListener('mousemove', updateMousePos);
window.addEventListener('touchmove', updateMousePos, { passive: false });
window.addEventListener('mouseleave', disableMouse);
window.addEventListener('touchend', disableMouse);

// Draw droplet with glow
function drawDroplet(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, CONFIG.dropletSize, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.dropletColor;
    ctx.shadowBlur = CONFIG.dropletGlow;
    ctx.shadowColor = CONFIG.dropletColor;
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow
}

// Draw atmosphere
function drawAtmosphere() {
    const grad = ctx.createRadialGradient(
        mouse.x || canvas.width / 2,
        mouse.y || canvas.height / 2,
        0,
        mouse.x || canvas.width / 2,
        mouse.y || canvas.height / 2,
        canvas.width / 1.5
    );
    grad.addColorStop(0, CONFIG.atmosphereColor);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Draw connections with delay for natural forming effect
function drawConnections(p, i) {
    for (let j = i + 1; j < points.length; j++) {
        const p2 = points[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CONFIG.maxDistance) {
            const now = Date.now();
            if (now > p.connectTime && now > p2.connectTime) {
                ctx.beginPath();
                ctx.strokeStyle = CONFIG.webColor;
                ctx.globalAlpha = 1 - dist / CONFIG.maxDistance;
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }
    }
}

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#002f4b');
    bgGrad.addColorStop(1, '#005f6b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAtmosphere();

    points.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce from edges
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Repel from mouse/touch
        if (mouse.active) {
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                p.vx += dx / dist * 0.05;
                p.vy += dy / dist * 0.05;
            }
        }

        drawDroplet(p);
        drawConnections(p, i);
    });

    requestAnimationFrame(animate);
}
animate();
