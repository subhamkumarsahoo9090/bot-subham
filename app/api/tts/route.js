import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  escapeTtsText,
  resolveIndianVoice,
  toProsodyPitch,
  toProsodyRate,
  toProsodyVolume,
} from "../../backend/indianTts.js";

function collectStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    };
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
    stream.on("end", finish);
    stream.on("close", finish);
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const text = String(body?.text || "").trim();
    if (!text) {
      return Response.json({ success: false, message: "text is required" }, { status: 400 });
    }

    // Keep requests reasonable for chat replies
    const clipped = text.slice(0, 1200);
    const gender = body?.gender === "male" ? "male" : "female";
    const lang = body?.lang || "en-IN";
    const { voice, locale } = resolveIndianVoice({ gender, lang });

    const rate = toProsodyRate(body?.rate);
    const pitch = toProsodyPitch(body?.pitch, gender);
    const volume = toProsodyVolume(body?.volume);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const { audioStream } = await tts.toStream(escapeTtsText(clipped), {
      rate,
      pitch,
      volume,
    });

    const audio = await collectStream(audioStream);
    if (!audio.length) {
      return Response.json(
        { success: false, message: "Empty audio from TTS" },
        { status: 502 }
      );
    }

    return new Response(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Voice": voice,
        "X-TTS-Locale": locale,
      },
    });
  } catch (err) {
    console.error("[tts]", err);
    return Response.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "TTS failed",
      },
      { status: 500 }
    );
  }
}
