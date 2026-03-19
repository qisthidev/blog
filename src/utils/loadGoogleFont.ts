import { readFile } from "node:fs/promises";

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

let preferLocalFonts = false;
let loggedLocalFallback = false;

async function loadGoogleFont(
  font: string,
  text: string,
  weight: number
): Promise<ArrayBuffer> {
  const API = `https://fonts.googleapis.com/css2?family=${font}:wght@${weight}&text=${encodeURIComponent(text)}`;

  const css = await (
    await fetch(API, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
      },
    })
  ).text();

  const resource = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/
  );

  if (!resource) throw new Error("Failed to download dynamic font");

  const res = await fetch(resource[1]);

  if (!res.ok) {
    throw new Error("Failed to download dynamic font. Status: " + res.status);
  }

  return res.arrayBuffer();
}

async function loadLocalFont(path: string): Promise<ArrayBuffer> {
  const data = await readFile(path);
  return toArrayBuffer(data);
}

async function loadFallbackFonts(): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  return Promise.all([
    loadLocalFont("/System/Library/Fonts/Supplemental/Verdana.ttf").then(
      data => ({
        name: "System Sans",
        data,
        weight: 400,
        style: "normal",
      })
    ),
    loadLocalFont("/System/Library/Fonts/Supplemental/Verdana Bold.ttf").then(
      data => ({
        name: "System Sans",
        data,
        weight: 700,
        style: "bold",
      })
    ),
  ]);
}

async function loadGoogleFonts(
  text: string
): Promise<
  Array<{ name: string; data: ArrayBuffer; weight: number; style: string }>
> {
  if (preferLocalFonts) {
    return loadFallbackFonts();
  }

  const fontsConfig = [
    {
      name: "IBM Plex Mono",
      font: "IBM+Plex+Mono",
      weight: 400,
      style: "normal",
    },
    {
      name: "IBM Plex Mono",
      font: "IBM+Plex+Mono",
      weight: 700,
      style: "bold",
    },
  ];

  try {
    const fonts = await Promise.all(
      fontsConfig.map(async ({ name, font, weight, style }) => {
        const data = await loadGoogleFont(font, text, weight);
        return { name, data, weight, style };
      })
    );

    return fonts;
  } catch (error) {
    preferLocalFonts = true;
    if (!loggedLocalFallback) {
      console.warn(
        "Falling back to local system fonts for OG image generation:",
        error
      );
      loggedLocalFallback = true;
    }

    return loadFallbackFonts();
  }
}

export default loadGoogleFonts;
