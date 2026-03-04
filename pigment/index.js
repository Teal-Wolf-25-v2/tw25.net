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

// ================= Contrast Helper =================
function getContrastTextColor(hex) {
    hex = hex.replace("#", "");
    const r = parseInt(hex.substring(0,2),16);
    const g = parseInt(hex.substring(2,4),16);
    const b = parseInt(hex.substring(4,6),16);

    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;

    return luminance > 0.6 ? "#000000" : "#FFFFFF";
}

// ================= Default Pigment =================
function getDefaultPigment(uuid){
    const big=uuidToBigInt(uuid);
    const msb=big>>64n;
    const lsb=big&((1n<<64n)-1n);
    const seed=msb^lsb;

    const rand=new JavaRandom(seed);

    const h1=rand.nextFloat();
    const s1=rand.nextFloatRange(0.4,0.8);
    const v1=rand.nextFloatRange(0.7,1.0);

    const h2=rand.nextFloat();
    const s2=rand.nextFloatRange(0.7,1.0);
    const v2=rand.nextFloatRange(0.2,0.7);

    return [
        decToHex(hsbToRgbInt(h1,s1,v1)),
        decToHex(hsbToRgbInt(h2,s2,v2))
    ];
}

// ================= Fetch VIP Pigment =================
async function getVipPigment(uuid) {
    try {
        const res = await fetch(
            "https://raw.githubusercontent.com/gamma-delta/contributors/main/paucal/contributors-v01.json5"
        );

        const text = await res.text();
        const data = JSONH-TS.parse(`{\n${text}\n}`);

        const normalized = uuid.replace(/-/g,"").toLowerCase();

        for (const key in data) {
            if (key.replace(/-/g,"").toLowerCase() === normalized) {
                const entry = data[key];

                if (entry["hexcasting:colorizer"]) {
                    // Convert decimal values like 0xe64539 to "#E64539"
                    return entry["hexcasting:colorizer"].map(num => {
                        return decToHex(Number(num));
                    });
                }
            }
        }

    } catch (e) {
        console.warn("VIP pigment fetch failed:", e);
    }

    return null;
}


// ================= Username → UUID =================
async function usernameToUUID(username) {
    const res = await fetch(
        `https://proxy.corsfix.com/?` + `https://api.mojang.com/users/profiles/minecraft/${username}`, {
        headers: {
            "x-corsfix-cache": "60m",
        },
    }
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

// ================= URL Handling =================
function getPathUser() {
    const path = window.location.pathname;
    if (path.startsWith("/pigment/")) {
        return decodeURIComponent(path.replace("/pigment/", ""));
    }
    return null;
}

// ================= Gradient Renderer =================
function renderGradient(colors) {
    const gradientDiv = document.getElementById("gradient");

    const stops = colors.map((c,i)=>
        `${c} ${(i/(colors.length-1))*100}%`
    ).join(",");

    gradientDiv.style.background =
        `linear-gradient(90deg, ${stops})`;

    document.getElementById("colors").innerHTML =
        colors.map(c =>
            `<div class="color-box"
                style="background:${c};color:${getContrastTextColor(c)}">
                ${c}
             </div>`
        ).join("");
}



// ================= Main =================
async function generatePigment(){
    let input=document.getElementById("userInput").value.trim();
    if(!input) return;

    history.pushState({}, "", "/pigment/"+encodeURIComponent(input));

    let uuid=input;
    let username=input;

    if(!isUUID(input)){
        uuid=await usernameToUUID(input);
        if(!uuid){ alert("Invalid username"); return; }
    }

    let colors = await getVipPigment(uuid);

    if(!colors){
        colors = getDefaultPigment(uuid);
    }

    renderGradient(colors);
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