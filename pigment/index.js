// ================= JavaRandom =================
class JavaRandom {
    constructor(seed) {
        this.multiplier = 0x5DEECE66Dn;
        this.addend = 0xBn;
        this.mask = (1n << 48n) - 1n;
        this.seed = (BigInt(seed) ^ this.multiplier) & this.mask;
    }
    next(bits) {
        this.seed = (this.seed * this.multiplier + this.addend) & this.mask;
        return Number(this.seed >> (48n - BigInt(bits)));
    }
    nextFloat() { return this.next(24) / (1 << 24); }
    nextFloatRange(l, h) { return l + (h - l) * this.nextFloat(); }
}

// ================= Helpers =================
function uuidToBigInt(uuid) {
    return BigInt("0x" + uuid.replace(/-/g, ""));
}

function isUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function hsbToRgbInt(h, s, v) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    r = Math.floor(r * 255);
    g = Math.floor(g * 255);
    b = Math.floor(b * 255);
    return (r << 16) | (g << 8) | b;
}

function decToHex(dec) {
    return "#" + dec.toString(16).padStart(6, "0").toUpperCase();
}

// ================= Pigment =================
function getPigment(uuid) {
    const big = uuidToBigInt(uuid);
    const msb = big >> 64n;
    const lsb = big & ((1n << 64n) - 1n);
    const seed = msb ^ lsb;
    const rand = new JavaRandom(seed);

    const h1 = rand.nextFloat();
    const s1 = rand.nextFloatRange(0.4, 0.8);
    const v1 = rand.nextFloatRange(0.7, 1.0);

    const h2 = rand.nextFloat();
    const s2 = rand.nextFloatRange(0.7, 1.0);
    const v2 = rand.nextFloatRange(0.2, 0.7);

    return [
        decToHex(hsbToRgbInt(h1, s1, v1)),
        decToHex(hsbToRgbInt(h2, s2, v2))
    ];
}

// ================= Username → UUID =================
async function usernameToUUID(username) {
    const res = await fetch(
        `https://api.mojang.com/users/profiles/minecraft/${username}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.id.replace(
        /(.{8})(.{4})(.{4})(.{4})(.{12})/,
        "$1-$2-$3-$4-$5"
    );
}

// ================= Skin =================
function showSkin(username) {
    document.getElementById("skin").innerHTML =
        `<img src="https://vzge.me/full/150/${username}" alt="Minecraft Skin">`;
}

// ================= Share =================
function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
}

// ================= PNG Export =================
function exportPNG() {
    const gradientDiv = document.getElementById("gradient");
    const style = getComputedStyle(gradientDiv);
    const bg = style.backgroundImage;

    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);

    const colors = bg.match(/#[0-9A-F]{6}/gi);
    if (!colors) return;

    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const link = document.createElement("a");
    link.download = "pigment.png";
    link.href = canvas.toDataURL();
    link.click();
}

// ================= URL Handling =================
function getPathUser() {
    const path = window.location.pathname;
    if (path.startsWith("/pigment/")) {
        return decodeURIComponent(path.replace("/pigment/", ""));
    }
    return null;
}

async function generatePigment() {
    let input = document.getElementById("userInput").value.trim();
    if (!input) return;

    history.pushState({}, "", "/pigment/" + encodeURIComponent(input));

    let uuid = input;
    let username = input;

    if (!isUUID(input)) {
        uuid = await usernameToUUID(input);
        if (!uuid) { alert("Invalid username"); return; }
    }

    const [c1, c2] = getPigment(uuid);

    const gradientDiv = document.getElementById("gradient");
    gradientDiv.style.background =
        `linear-gradient(90deg, ${c1}, ${c2}, ${c1}, ${c2}, ${c1}, ${c2})`;

    document.getElementById("colors").innerHTML =
        `<div class="color-box" style="background:${c1}">${c1}</div>
         <div class="color-box" style="background:${c2}">${c2}</div>`;

    showSkin(username);
}

if (sessionStorage.redirect) {
    const path = sessionStorage.redirect;
    sessionStorage.removeItem("redirect");
    history.replaceState({}, "", path);
}

window.addEventListener("DOMContentLoaded", () => {
    const user = getPathUser();
    if (user) {
        document.getElementById("userInput").value = user;
        generatePigment();
    }
});