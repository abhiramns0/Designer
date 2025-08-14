// === CONFIGURABLE SETTINGS === //
const config = {
    numParticles: 250, // base number
    connectionDistance: 150,
    repelRadius: 100,
    repelStrength: 0.15,
    diagonalDensityBoost: 2.0, // multiplier for denser diagonal
    bokehCount: 20,
    bokehMaxSize: 80,
    densityRegions: [
        { x1: 0, y1: 1, x2: 1, y2: 0, radius: 0.2, multiplier: 2.0 } // diagonal bottom-left to top-right
    ]
};

const canvas = document.getElementById("interactive-bg");
const ctx = canvas.getContext("2d");

let particles = [];
let bokehDots = [];
let mouse = { x: null, y: null };

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

// === UTILS === //
function distance(p1, p2) {
    let dx = p1.x - p2.x;
    let dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}

// === PARTICLE === //
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = random(-0.5, 0.5);
        this.vy = random(-0.5, 0.5);
        this.size = random(1, 3);
    }

    update() {
        // Repel from mouse
        if (mouse.x !== null && mouse.y !== null) {
            let dist = distance(this, mouse);
            if (dist < config.repelRadius) {
                let angle = Math.atan2(this.y - mouse.y, this.x - mouse.x);
                let force = (config.repelRadius - dist) / config.repelRadius;
                this.vx += Math.cos(angle) * force * config.repelStrength;
                this.vy += Math.sin(angle) * force * config.repelStrength;
            }
        }

        this.x += this.vx;
        this.y += this.vy;

        // Bounce at edges
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fill();
    }
}

// === BOKEH DOT === //
class Bokeh {
    constructor() {
        this.x = random(0, canvas.width);
        this.y = random(0, canvas.height);
        this.size = random(20, config.bokehMaxSize);
        this.blur = this.size / 2;
        this.vx = random(-0.1, 0.1);
        this.vy = random(-0.1, 0.1);
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < -this.size) this.x = canvas.width + this.size;
        if (this.x > canvas.width + this.size) this.x = -this.size;
        if (this.y < -this.size) this.y = canvas.height + this.size;
        if (this.y > canvas.height + this.size) this.y = -this.size;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,0,0,0.15)`;
        ctx.shadowBlur = this.blur;
        ctx.shadowColor = "black";
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// === INIT === //
function initParticles() {
    particles = [];
    for (let i = 0; i < config.numParticles; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;

        // Check density regions
        config.densityRegions.forEach(region => {
            let t = ((x / canvas.width) * (region.x2 - region.x1) + region.x1) +
                    ((y / canvas.height) * (region.y2 - region.y1) + region.y1);
            if (Math.random() < region.multiplier * 0.5) {
                particles.push(new Particle(x, y));
            }
        });

        particles.push(new Particle(x, y));
    }
}

function initBokeh() {
    bokehDots = [];
    for (let i = 0; i < config.bokehCount; i++) {
        bokehDots.push(new Bokeh());
    }
}

initParticles();
initBokeh();

// === ANIMATE === //
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#001d3d");
    gradient.addColorStop(1, "#003566");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw bokeh first
    bokehDots.forEach(dot => {
        dot.update();
        dot.draw();
    });

    // Update and draw particles
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    // Draw connections with smooth alpha
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            let dist = distance(particles[i], particles[j]);
            if (dist < config.connectionDistance) {
                let alpha = 1 - dist / config.connectionDistance;
                ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.5})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }

    requestAnimationFrame(animate);
}

animate();

// === EVENT LISTENERS === //
canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
canvas.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
});
canvas.addEventListener("touchmove", e => {
    mouse.x = e.touches[0].clientX;
    mouse.y = e.touches[0].clientY;
});
canvas.addEventListener("touchend", () => {
    mouse.x = null;
    mouse.y = null;
});
