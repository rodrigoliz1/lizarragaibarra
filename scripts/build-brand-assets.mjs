import sharp from "sharp";

const sources = [
  {
    input:
      "/Users/rodrigo/Developer/LIZARRAGA IBARRA/brand/logo/Captura de pantalla 2026-09-17 a la(s) 3.34.54 p.m..png",
    output: "public/brand/monogram-transparent.png",
    inverseOutput: "public/brand/monogram-inverse-transparent.png",
  },
  {
    input:
      "/Users/rodrigo/Developer/LIZARRAGA IBARRA/brand/logo/Captura de pantalla 2026-09-17 a la(s) 3.35.03 p.m..png",
    output: "public/brand/wordmark-transparent.png",
    inverseOutput: "public/brand/wordmark-inverse-transparent.png",
  },
];

for (const source of sources) {
  const { data, info } = await sharp(source.input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const output = Buffer.alloc(info.width * info.height * 4);
  const inverseOutput = Buffer.alloc(info.width * info.height * 4);

  for (let index = 0; index < info.width * info.height; index += 1) {
    const offset = index * 3;
    const target = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const darkest = Math.min(red, green, blue);
    const lightest = Math.max(red, green, blue);
    const chroma = lightest - darkest;
    const brightness = (red + green + blue) / 3;
    const isChampagne = chroma > 16 && red > green && green > blue;
    const alpha = isChampagne
      ? Math.max(0, Math.min(255, (246 - brightness) * 4.4))
      : Math.max(0, Math.min(255, (249 - brightness) * 1.12));

    output[target] = isChampagne ? 172 : 18;
    output[target + 1] = isChampagne ? 150 : 18;
    output[target + 2] = isChampagne ? 112 : 17;
    output[target + 3] = alpha;

    inverseOutput[target] = isChampagne ? 172 : 247;
    inverseOutput[target + 1] = isChampagne ? 150 : 245;
    inverseOutput[target + 2] = isChampagne ? 112 : 239;
    inverseOutput[target + 3] = alpha;
  }

  await sharp(output, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(source.output);

  await sharp(inverseOutput, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(source.inverseOutput);
}
