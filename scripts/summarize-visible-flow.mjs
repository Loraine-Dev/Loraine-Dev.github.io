import fs from "node:fs/promises";
import sharp from "sharp";
const out = "artifacts/visible-flow/comparison";
const summaries = [];
for (const device of ["desktop", "mobile"]) {
  const report = JSON.parse(
    await fs.readFile(`${out}/${device}-report.json`, "utf8"),
  );
  for (const s of report.sessions) {
    const first = s.samples.find((x) => x.second === 0),
      five = s.samples.find((x) => x.second === 5),
      entered = s.samples.find((x) => x.second === 22);
    const translate = (transform) =>
      Number(
        transform
          .slice(transform.startsWith("matrix3d") ? 9 : 7, -1)
          .split(",")[transform.startsWith("matrix3d") ? 12 : 4],
      );
    const cloud = (snapshot) =>
      snapshot.state.modules.find((m) => m.name === "farFog");
    const a = await sharp(`${out}/${device}-${s.mode}-0s.png`)
      .removeAlpha()
      .raw()
      .toBuffer();
    const b = await sharp(`${out}/${device}-${s.mode}-5s.png`)
      .removeAlpha()
      .raw()
      .toBuffer();
    let max = 0,
      changed = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      max = Math.max(max, d);
      if (d >= 8) changed++;
    }
    summaries.push({
      device,
      mode: s.mode,
      sampleSeconds: [first.elapsedSeconds, five.elapsedSeconds],
      cloudDensity: [cloud(first).opacity, cloud(five).opacity],
      cloudTravelCSSPixels: Math.abs(
        translate(cloud(five).transform) - translate(cloud(first).transform),
      ),
      maxChannelDelta: max,
      channelsChangedBy8: changed,
      scrollAtFirst5: [first.state.scrollY, five.state.scrollY],
      cameraZEntered: entered.state.camera.cameraZ,
      cameraProgress: entered.state.camera.progress,
      errors: s.errors,
    });
  }
}
await fs.writeFile(`${out}/summary.json`, JSON.stringify(summaries, null, 2));
console.log(summaries);
