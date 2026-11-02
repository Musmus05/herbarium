// Turns the Recordly export into web-ready files.
//   in:  docs/demo/herbarium-demo.mp4   (Recordly export, see docs/demo/SCENARIO.md)
//   out: public/demo/herbarium-demo.mp4          H.264, 1280 px, no audio, fast start
//        public/demo/herbarium-demo-poster.webp  first-frame poster for the landing page
//        docs/demo/herbarium-demo.gif            short loop for the README (0:22 to 0:46)
// Usage: node scripts/prepare-demo.mjs [gifStartSeconds] [gifDurationSeconds]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const input = "docs/demo/herbarium-demo.mp4";
if (!existsSync(input)) {
  console.error(`Missing ${input}: export the Recordly video there first.`);
  process.exit(1);
}
mkdirSync("public/demo", { recursive: true });

const run = (args) => execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
const size = (file) => `${(statSync(file).size / 1024 / 1024).toFixed(1)} MB`;

run(["-i", input, "-an", "-vf", "scale=1280:-2:flags=lanczos,fps=30", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "public/demo/herbarium-demo.mp4"]);
console.log("video", size("public/demo/herbarium-demo.mp4"));

run(["-ss", "1", "-i", input, "-frames:v", "1", "-vf", "scale=1280:-2", "-c:v", "libwebp", "-quality", "82", "public/demo/herbarium-demo-poster.webp"]);
console.log("poster", size("public/demo/herbarium-demo-poster.webp"));

const [start = "22", duration = "20"] = process.argv.slice(2);
run([
  "-ss", start, "-t", duration, "-i", input,
  "-vf", "fps=10,scale=800:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=sierra2_4a",
  "docs/demo/herbarium-demo.gif",
]);
console.log("gif", size("docs/demo/herbarium-demo.gif"));
