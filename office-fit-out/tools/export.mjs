// Writes voice/lines.json (for tts.py / asr_check.py), timeline.json (for mix.py) and, once voice/out/dur.json exists,
// cues.json (burned-in subtitles) and out/cues_srt.json. Usage: node tools/export.mjs <project folder>
import fs from 'fs'; import path from 'path'; import { pathToFileURL } from 'url';
const HERE = path.resolve(process.argv[2] || '.');
const TL = await import(pathToFileURL(path.join(HERE, 'src/timeline.js')).href);
fs.mkdirSync(path.join(HERE, 'voice'), { recursive: true }); fs.mkdirSync(path.join(HERE, 'out'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'voice/lines.json'), JSON.stringify(TL.VO.map(v => ({ id: v.id, text: v.say, voice: 'bf_emma', speed: .95, ...(v.asr ? { asr: v.asr } : {}) })), null, 1));
fs.writeFileSync(path.join(HERE, 'timeline.json'), JSON.stringify({ BPM: TL.BPM, T: TL.T, VO: TL.VO, LAND: TL.LAND }, null, 1));
const dp = path.join(HERE, 'voice/out/dur.json');
if (fs.existsSync(dp)) {
  const D = JSON.parse(fs.readFileSync(dp, 'utf8')); const cues = [];
  TL.VO.forEach((v, i) => {
    const d = D[v.id]; if (d == null) throw new Error('no duration for ' + v.id);
    const next = TL.VO[i + 1] ? TL.VO[i + 1].t - .08 : TL.T.title - .1;
    const t1 = Math.min(next, v.t + Math.max(1.8, d + .6));
    if (t1 - v.t < Math.max(1.8, d + .6) - 1e-3) console.warn(`! ${v.id}: cue ${(t1 - v.t).toFixed(2)} s < needed ${Math.max(1.8, d + .6).toFixed(2)} s`);
    if (v.t + d > next + .08) console.warn(`! ${v.id}: speech ends at ${(v.t + d).toFixed(2)} after the next line starts`);
    cues.push({ id: v.id, t0: +(v.t - .05).toFixed(3), t1: +t1.toFixed(3), en: v.en, text: v.en });
  });
  fs.writeFileSync(path.join(HERE, 'cues.json'), JSON.stringify(cues, null, 1));
  fs.writeFileSync(path.join(HERE, 'out/cues_srt.json'), JSON.stringify(cues.map(c => ({ t0: c.t0, t1: c.t1, text: c.text })), null, 1));
  console.log('cues:', cues.map(c => `${c.id} ${c.t0}-${c.t1}`).join('  '));
}
