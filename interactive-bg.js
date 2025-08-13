// interactive-bg.js
const canvas = document.getElementById("interactive-bg");
const ctx = canvas.getContext("2d");

let particles = [];
const settings = {
    particleCount: 80,       // Number of droplets
    maxConnectionDist: 180,  // Distance for connecting lines
    particleSize: 3,         // Droplet radius
    repelStrength: 0.15,     // Repelling force
    glowStrength: 25,        // Particle glow blur
    connectionSpeed: 0.03,   // How quickly connections form
    atmosphereAlpha: 0.08,   // Faint glow around everything
};

let mouse = { x: null, y: null };

// Resize canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// Mouse / touch tracking
window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener("touchmove", e => {
    if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
    }
});

// Particle class
class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.7;
        this.vy = (Math.random() - 0.5) * 0.7;
        this.connectionProgress = 0; // smooth connection forming
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce on edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;

        // Mouse repel
        if (mouse.x && mouse.y) {
            let dx = this.x - mouse.x;
            let dy = this.y - mouse.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                let angle = Math.atan2(dy, dx);
                let force = (100 - dist) * settings.repelStrength;
                this.vx += Math.cos(angle) * force;
                this.vy += Math.sin(angle) * force;
            }
        }
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, settings.particleSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(173, 216, 230, 0.9)";
        ctx.shadowBlur = settings.glowStrength;
        ctx.shadowColor = "rgba(173, 216, 230, 0.8)";
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Create particles
function init() {
    particles = [];
    for (let i = 0; i < settings.particleCount; i++) {
        particles.push(new Particle());
    }
}
init();

// Draw connections
function drawConnections() {
    for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
            let dx = particles[a].x - particles[b].x;
            let dy = particles[a].y - particles[b].y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < settings.maxConnectionDist) {
                // Gradually form connections
                particles[a].connectionProgress += settings.connectionSpeed;
                let opacity = Math.min(particles[a].connectionProgress, 1) * (1 - dist / settings.maxConnectionDist);
                ctx.beginPath();
                ctx.moveTo(particles[a].x, particles[a].y);
                ctx.lineTo(particles[b].x, particles[b].y);
                ctx.strokeStyle = `rgba(173, 216, 230, ${opacity})`;
                ctx.lineWidth = 1;
                ctx.shadowBlur = settings.glowStrength / 2;
                ctx.shadowColor = "rgba(173, 216, 230, 0.7)";
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }
    }
}

// Atmosphere
function drawAtmosphere() {
    let gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.5
    );
    gradient.addColorStop(0, `rgba(100, 150, 255, ${settings.atmosphereAlpha})`);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Animate
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    let bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, "#002b55");
    bgGradient.addColorStop(1, "#004d80");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawAtmosphere();

    particles.forEach(p => {
        p.update();
        p.draw();
    });
    drawConnections();

    requestAnimationFrame(animate);
}
animate();
