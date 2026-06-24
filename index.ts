const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    create_stars();
});

function clear() {
    ctx.fillStyle = "#020208";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw_star(x: number, y: number, maxRadius: number, baseColor: string) {
    ctx.save();
    let glow = ctx.createRadialGradient(x, y, 0, x, y, maxRadius);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.1, baseColor);
    glow.addColorStop(0.4, 'rgba(100, 150, 255, 0.15)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, maxRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'screen';
    draw_spike(x, y, maxRadius * 0.8, maxRadius * 0.08, 0);
    draw_spike(x, y, maxRadius * 0.8, maxRadius * 0.08, Math.PI / 2);

    let core = ctx.createRadialGradient(x, y, 0, x, y, maxRadius * 0.05);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(x, y, maxRadius * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function draw_spike(x: number, y: number, length: number, width: number, angle: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    let spikeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, length);
    spikeGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    spikeGradient.addColorStop(0.2, 'rgba(200, 220, 255, 0.6)');
    spikeGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = spikeGradient;
    ctx.beginPath();
    ctx.moveTo(-length, 0);
    ctx.quadraticCurveTo(0, -width, length, 0);
    ctx.quadraticCurveTo(0, width, -length, 0);
    ctx.fill();
    ctx.restore();
}

interface Point2D {
    x: number;
    y: number;
}

interface Point3D {
    x: number;
    y: number;
    z: number;
}

interface RingImage {
    url: string;
    thumbUrl: string;
    angle: number;
    baseAngle: number;
    radius: number;
    yOffset: number;
    speed: number;
    x: number;
    y: number;
    z: number;
}

interface ActiveStar {
    x: number;
    y: number;
    radius: number;
    color: string;
}

const MIN_IMAGES = 520;
const STAR_COUNT = 150;
const Z_OFFSET = 4.2;
const FOCAL_LENGTH = 1.45;
const BASE_IMG_SIZE = 0.32;

const AVAILABLE_IMAGES = [
    "./fotos/1950_jaguar_xk120_alloy_roadster.jpg",
    "./fotos/corvetter_1970.jpg",
    "./fotos/hydra_car.jpg"
];

const stars: ActiveStar[] = [];
const ringImages: RingImage[] = [];
const imgCache: Record<string, HTMLImageElement> = {};
const loadingUrls = new Set<string>();

function get_thumbnail_url(url: string): string {
    const lastSlash = url.lastIndexOf("/");
    if (lastSlash === -1) return url;
    return url.substring(0, lastSlash) + "/thumbnails" + url.substring(lastSlash);
}

function load_thumbnail_async(thumbUrl: string, fallbackUrl: string) {
    if (imgCache[thumbUrl] || loadingUrls.has(thumbUrl)) return;
    
    loadingUrls.add(thumbUrl);
    
    const img = new Image();
    img.src = thumbUrl;
    img.onload = () => {
        imgCache[thumbUrl] = img;
        loadingUrls.delete(thumbUrl);
        console.log(`[Gallery] Loaded thumbnail successfully: ${thumbUrl}`);
    };
    img.onerror = () => {
        console.warn(`[Gallery] Thumbnail failed to load: ${thumbUrl}. Falling back to original image: ${fallbackUrl}`);
        
        if (imgCache[fallbackUrl]) {
            imgCache[thumbUrl] = imgCache[fallbackUrl];
            loadingUrls.delete(thumbUrl);
            return;
        }
        
        const fallbackImg = new Image();
        fallbackImg.src = fallbackUrl;
        fallbackImg.onload = () => {
            imgCache[thumbUrl] = fallbackImg;
            imgCache[fallbackUrl] = fallbackImg;
            loadingUrls.delete(thumbUrl);
            console.log(`[Gallery] Loaded fallback original image: ${fallbackUrl}`);
        };
        fallbackImg.onerror = () => {
            loadingUrls.delete(thumbUrl);
            console.error(`[Gallery] Fallback original image failed to load: ${fallbackUrl}`);
        };
    };
}

function draw_placeholder(x: number, y: number, w: number, h: number, z: number) {
    ctx.save();
    const rx = x - w / 2;
    const ry = y - h / 2;
    const time = performance.now() * 0.002;
    const pulse = 0.15 + 0.05 * Math.sin(time + z);
    
    const gradient = ctx.createLinearGradient(rx, ry, rx + w, ry + h);
    gradient.addColorStop(0, `rgba(15, 15, 35, ${0.4 + pulse})`);
    gradient.addColorStop(0.5, `rgba(30, 30, 65, ${0.3 + pulse})`);
    gradient.addColorStop(1, `rgba(10, 10, 25, ${0.4 + pulse})`);
    
    ctx.fillStyle = gradient;
    if (ctx.roundRect) {
        ctx.roundRect(rx, ry, w, h, 6);
    } else {
        ctx.rect(rx, ry, w, h);
    }
    ctx.fill();
    
    ctx.strokeStyle = `rgba(100, 150, 255, ${0.15 + pulse})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
}

function create_stars() {
    stars.length = 0;
    for (let i = 0; i < STAR_COUNT; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.floor(Math.random() * (7 - 2 + 1)) + 2;
        const color = `rgba(${160 + Math.random() * 95}, ${180 + Math.random() * 75}, 255, 0.4)`;
        stars.push({ x, y, radius, color });
    }
}

function init_ring_images() {
    ringImages.length = 0;
    for (let i = 0; i < MIN_IMAGES; i++) {
        const url = AVAILABLE_IMAGES[i % AVAILABLE_IMAGES.length];
        let radius = 0;
        const rand = Math.random();
        if (rand < 0.15) {
            radius = 0.90 + Math.random() * 0.25;
        } else if (rand < 0.70) {
            radius = 1.30 + Math.random() * 0.80;
        } else {
            radius = 2.30 + Math.random() * 0.65;
        }
        const baseAngle = Math.random() * Math.PI * 2;
        const yOffset = (Math.random() - 0.5) * 0.55;
        const baseSpeed = 0.35;
        const speed = baseSpeed / Math.pow(radius, 1.5);
        ringImages.push({
            url,
            thumbUrl: get_thumbnail_url(url),
            angle: baseAngle,
            baseAngle,
            radius,
            yOffset,
            speed,
            x: 0,
            y: 0,
            z: 0
        });
    }
}

function get_base_scale(): number {
    return Math.min(canvas.width, canvas.height) / 2;
}

function project({ x, y, z }: Point3D): Point2D {
    return {
        x: (x * FOCAL_LENGTH) / z,
        y: (y * FOCAL_LENGTH) / z
    };
}

function screen({ x, y }: Point2D): Point2D {
    const scale = get_base_scale();
    return {
        x: canvas.width / 2 + x * scale,
        y: canvas.height / 2 - y * scale
    };
}

let cameraTiltX = 0;
let cameraYaw = 0;
let targetTiltX = 0;
let targetYaw = 0;

let isDragging = false;
let startX = 0;
let startY = 0;
let lastMoveTime = 0;
let velocityYaw = 0;

let activeModal: HTMLDivElement | null = null;

function show_modal(thumbUrl: string, fullUrl: string) {
    if (activeModal) return;
    
    const modal = document.createElement("div");
    modal.className = "gallery-modal";
    
    const container = document.createElement("div");
    container.className = "modal-image-container";
    
    const thumbImg = document.createElement("img");
    thumbImg.src = thumbUrl;
    thumbImg.className = "modal-image-thumb";
    
    const fullImg = document.createElement("img");
    fullImg.className = "modal-image-full";
    
    const spinner = document.createElement("div");
    spinner.className = "modal-spinner";
    
    container.appendChild(thumbImg);
    container.appendChild(fullImg);
    container.appendChild(spinner);
    modal.appendChild(container);
    document.body.appendChild(modal);
    
    fullImg.onload = () => {
        fullImg.classList.add("loaded");
        spinner.classList.add("hidden");
    };
    fullImg.onerror = () => {
        console.error(`Failed to load full image: ${fullUrl}`);
        spinner.classList.add("hidden");
        thumbImg.style.filter = "none";
    };
    fullImg.src = fullUrl;
    
    requestAnimationFrame(() => {
        modal.classList.add("active");
    });
    
    const close = () => {
        modal.classList.remove("active");
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
            activeModal = null;
        }, 300);
    };
    
    modal.addEventListener("click", close);
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            close();
            window.removeEventListener("keydown", handleKeyDown);
        }
    };
    window.addEventListener("keydown", handleKeyDown);
    
    activeModal = modal;
}

function handle_click(mx: number, my: number) {
    const scale = get_base_scale();
    const sortedNearToFar = [...ringImages].sort((a, b) => a.z - b.z);
    for (const v of sortedNearToFar) {
        const proj = project(v);
        const pos = screen(proj);
        const targetWidth = ((BASE_IMG_SIZE * FOCAL_LENGTH * scale) / v.z) * 0.8;
        const img = imgCache[v.thumbUrl];
        const aspectRatio = img ? (img.naturalHeight / img.naturalWidth) : 0.75;
        const targetHeight = targetWidth * aspectRatio;
        if (
            mx >= pos.x - targetWidth / 2 &&
            mx <= pos.x + targetWidth / 2 &&
            my >= pos.y - targetHeight / 2 &&
            my <= pos.y + targetHeight / 2
        ) {
            show_modal(v.thumbUrl, v.url);
            break;
        }
    }
}

canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    lastMoveTime = performance.now();
    velocityYaw = 0;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    targetYaw += dx * 0.005;
    targetTiltX -= dy * 0.005;
    targetTiltX = Math.max(-85 * Math.PI / 180, Math.min(85 * Math.PI / 180, targetTiltX));
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
        velocityYaw = (dx * 0.005) / (dt / 1000);
    }
    startX = e.clientX;
    startY = e.clientY;
    lastMoveTime = now;
});

window.addEventListener("mouseup", (e) => {
    if (isDragging) {
        const distance = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        if (distance < 5) {
            handle_click(e.clientX, e.clientY);
        }
    }
    isDragging = false;
});

canvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        lastMoveTime = performance.now();
        velocityYaw = 0;
    }
});

window.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    targetYaw += dx * 0.005;
    targetTiltX -= dy * 0.005;
    targetTiltX = Math.max(-85 * Math.PI / 180, Math.min(85 * Math.PI / 180, targetTiltX));
    const now = performance.now();
    const dt = now - lastMoveTime;
    if (dt > 0) {
        velocityYaw = (dx * 0.005) / (dt / 1000);
    }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastMoveTime = now;
});

window.addEventListener("touchend", (e) => {
    if (isDragging && e.changedTouches.length === 1) {
        const distance = Math.sqrt(Math.pow(e.changedTouches[0].clientX - startX, 2) + Math.pow(e.changedTouches[0].clientY - startY, 2));
        if (distance < 5) {
            handle_click(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
        }
    }
    isDragging = false;
});

function draw_ring_image(ringImg: RingImage) {
    const img = imgCache[ringImg.thumbUrl];
    const proj = project(ringImg);
    const pos = screen(proj);
    const scale = get_base_scale();
    const targetWidth = ((BASE_IMG_SIZE * FOCAL_LENGTH * scale) / ringImg.z) * 0.8;
    const aspectRatio = img ? (img.naturalHeight / img.naturalWidth) : 0.75;
    const targetHeight = targetWidth * aspectRatio;
    if (
        pos.x + targetWidth / 2 < 0 ||
        pos.x - targetWidth / 2 > canvas.width ||
        pos.y + targetHeight / 2 < 0 ||
        pos.y - targetHeight / 2 > canvas.height
    ) {
        return;
    }
    
    if (img) {
        ctx.drawImage(img, pos.x - targetWidth / 2, pos.y - targetHeight / 2, targetWidth, targetHeight);
    } else {
        draw_placeholder(pos.x, pos.y, targetWidth, targetHeight, ringImg.z);
        load_thumbnail_async(ringImg.thumbUrl, ringImg.url);
    }
}

let lastTime = performance.now();

function frame(now: number) {
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    cameraTiltX += (targetTiltX - cameraTiltX) * 0.1;
    cameraYaw += (targetYaw - cameraYaw) * 0.1;
    if (!isDragging) {
        if (Math.abs(velocityYaw) > 0.01) {
            targetYaw += velocityYaw * dt;
            velocityYaw *= Math.exp(-2.5 * dt);
        } else {
            targetYaw += 0.03 * dt;
        }
    }
    clear();
    for (const star of stars) {
        draw_star(star.x, star.y, star.radius, star.color);
    }
    for (const v of ringImages) {
        v.angle = v.baseAngle + now * 0.001 * v.speed;
        const rx = v.radius * Math.cos(v.angle);
        const rz = v.radius * Math.sin(v.angle);
        const ry = v.yOffset;
        const x1 = rx * Math.cos(cameraYaw) - rz * Math.sin(cameraYaw);
        const z1 = rx * Math.sin(cameraYaw) + rz * Math.cos(cameraYaw);
        const y1 = ry;
        const x2 = x1;
        const y2 = y1 * Math.cos(cameraTiltX) - z1 * Math.sin(cameraTiltX);
        const z2 = y1 * Math.sin(cameraTiltX) + z1 * Math.cos(cameraTiltX);
        v.x = x2;
        v.y = y2;
        v.z = z2 + Z_OFFSET;
    }
    const sortedImages = [...ringImages].sort((a, b) => b.z - a.z);
    for (const v of sortedImages) {
        draw_ring_image(v);
    }
    requestAnimationFrame(frame);
}

function start_gallery() {
    create_stars();
    init_ring_images();
    requestAnimationFrame(frame);
}

// Authentication Protection
const correctPasscode = "120323";
const authOverlay = document.getElementById("auth-overlay") as HTMLDivElement;
const authInput = document.getElementById("auth-input") as HTMLInputElement;
const authSubmit = document.getElementById("auth-submit") as HTMLButtonElement;
const authError = document.getElementById("auth-error") as HTMLDivElement;

function check_authentication() {
    if (sessionStorage.getItem("gallery_authenticated") === "true") {
        if (authOverlay) authOverlay.classList.add("hidden");
        start_gallery();
    } else {
        if (authSubmit && authInput) {
            const verify = () => {
                if (authInput.value === correctPasscode) {
                    sessionStorage.setItem("gallery_authenticated", "true");
                    if (authOverlay) {
                        authOverlay.classList.add("hidden");
                    }
                    start_gallery();
                } else {
                    if (authError) {
                        authError.style.display = "block";
                        authError.style.animation = "none";
                        void authError.offsetWidth; // Trigger reflow
                        authError.style.animation = "shake 0.3s ease";
                    }
                    authInput.value = "";
                    authInput.focus();
                }
            };

            authSubmit.addEventListener("click", verify);
            authInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    verify();
                }
            });
            setTimeout(() => authInput.focus(), 100);
        } else {
            start_gallery();
        }
    }
}

check_authentication();