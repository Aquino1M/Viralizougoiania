import { exec } from "node:child_process";
import path from "node:path";

const videoPath = path.resolve("333333333333333333333333333333333333.mp4");

exec(`ffprobe -v error -show_entries stream=index,codec_name,codec_type,width,height,r_frame_rate,duration -show_entries format=duration,size -of json "${videoPath}"`, (err, stdout, stderr) => {
  if (err) {
    console.error("ffprobe error:", err);
    return;
  }
  console.log("PROBE_RESULT:", stdout);
});
