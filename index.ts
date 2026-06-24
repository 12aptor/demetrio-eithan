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
    originalX: number;
    originalY: number;
    originalZ: number;
    speed: number;
    x: number;
    y: number;
    z: number;
    angle: number;
    baseAngle: number;
    radius: number;
    yOffset: number;
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

        const originalX = ((i / MIN_IMAGES) * 24) - 12;
        const originalZ = 1.5 + Math.random() * 4.0;
        const actualZ = originalZ + Z_OFFSET;

        const projectedY = (Math.random() - 0.5) * 2 * 0.95;
        const originalY = (projectedY * actualZ) / FOCAL_LENGTH;

        const speed = 0.8 + Math.random() * 0.4;

        ringImages.push({
            url,
            thumbUrl: get_thumbnail_url(url),
            originalX,
            originalY,
            originalZ,
            speed,
            x: 0,
            y: 0,
            z: 0,
            angle: 0,
            baseAngle: 0,
            radius: 0,
            yOffset: originalY
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
        y: canvas.height / 2 - y * (canvas.height / 2)
    };
}

let scrollOffset = 0;
let scrollVelocity = 0;
const AUTO_SCROLL_SPEED = 0.8;

let isDragging = false;
let startX = 0;
let startY = 0;
let lastDragX = 0;
let lastDragTime = 0;

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

    setTimeout(() => {
        modal.addEventListener("click", close);
    }, 100);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            close();
            window.removeEventListener("keydown", handleKeyDown);
        }
    };
    window.addEventListener("keydown", handleKeyDown);

    activeModal = modal;
}

function get_image_dimensions(z: number, scale: number, aspectRatio: number): { width: number, height: number } {
    const isMobile = canvas.width < 768;
    const multiplier = isMobile ? 8.0 : 2.5;
    const width = ((BASE_IMG_SIZE * FOCAL_LENGTH * scale) / z) * multiplier;
    const height = width * aspectRatio;
    return { width, height };
}

function handle_click(mx: number, my: number) {
    const scale = get_base_scale();
    const sortedNearToFar = [...ringImages].sort((a, b) => a.z - b.z);
    for (const v of sortedNearToFar) {
        const proj = project(v);
        const pos = screen(proj);
        const img = imgCache[v.thumbUrl];
        const aspectRatio = img ? (img.naturalHeight / img.naturalWidth) : 0.75;
        const { width: targetWidth, height: targetHeight } = get_image_dimensions(v.z, scale, aspectRatio);
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
    lastDragX = e.clientX;
    lastDragTime = performance.now();
    scrollVelocity = 0;
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const currentX = e.clientX;
    const dx = currentX - lastDragX;
    lastDragX = currentX;

    const scale = get_base_scale();
    const referenceZ = 3.5;
    const deltaX = (dx * referenceZ) / (FOCAL_LENGTH * scale);

    scrollOffset -= deltaX;

    const now = performance.now();
    const dt = (now - lastDragTime) / 1000;
    if (dt > 0) {
        scrollVelocity = -deltaX / dt;
    }
    lastDragTime = now;
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
        lastDragX = e.touches[0].clientX;
        lastDragTime = performance.now();
        scrollVelocity = 0;
    }
});

window.addEventListener("touchmove", (e) => {
    if (!isDragging || e.touches.length !== 1) return;

    const currentX = e.touches[0].clientX;
    const dx = currentX - lastDragX;
    lastDragX = currentX;

    const scale = get_base_scale();
    const referenceZ = 3.5;
    const deltaX = (dx * referenceZ) / (FOCAL_LENGTH * scale);

    scrollOffset -= deltaX;

    const now = performance.now();
    const dt = (now - lastDragTime) / 1000;
    if (dt > 0) {
        scrollVelocity = -deltaX / dt;
    }
    lastDragTime = now;
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
    const aspectRatio = img ? (img.naturalHeight / img.naturalWidth) : 0.75;
    const { width: targetWidth, height: targetHeight } = get_image_dimensions(ringImg.z, scale, aspectRatio);

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

    if (!isDragging) {
        if (Math.abs(scrollVelocity) > 0.01) {
            scrollOffset += scrollVelocity * dt;
            scrollVelocity *= Math.exp(-3.0 * dt); // decelerate
        } else {
            const speedMultiplier = 1.0 + 0.75 * Math.sin(now * 0.0008) * Math.cos(now * 0.0003);
            scrollOffset += AUTO_SCROLL_SPEED * speedMultiplier * dt;
        }
    }

    clear();
    for (const star of stars) {
        draw_star(star.x, star.y, star.radius, star.color);
    }
    for (const v of ringImages) {
        const isBackground = v.originalZ > 3.5;
        let x = 0;
        if (isBackground) {
            x = (v.originalX + scrollOffset) % 24;
        } else {
            x = (v.originalX - scrollOffset) % 24;
        }

        if (x < -12) x += 24;
        if (x > 12) x -= 24;

        v.x = x;
        v.y = v.originalY;
        v.z = v.originalZ + Z_OFFSET;
    }
    const sortedImages = [...ringImages].sort((a, b) => b.z - a.z);
    for (const v of sortedImages) {
        draw_ring_image(v);
    }
    requestAnimationFrame(frame);
}

create_stars();
init_ring_images();
requestAnimationFrame(frame);