import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadImageAsBase64(filename) {
    const filePath = join(process.cwd(), "public", filename);
    const buffer = readFileSync(filePath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
}

// Lazy-loaded and cached
let _avatar;
let _logo;

export function getAvatarBase64() {
    if (!_avatar) _avatar = loadImageAsBase64("avatar.png");
    return _avatar;
}

export function getLogoBase64() {
    if (!_logo) _logo = loadImageAsBase64("ramageek.png");
    return _logo;
}

export const BRAND = {
    red: "#C83B54",
    redLight: "#E05A73",
    redDark: "#A02D44",
    bgDark: "#212737",
    bgLight: "#fdfdfd",
    fgDark: "#eaedf3",
    fgLight: "#282728",
};
