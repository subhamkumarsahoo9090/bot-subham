import { getVoiceCatalog } from "../../backend/voiceTypes.js";

export async function GET() {
  return Response.json({
    success: true,
    data: getVoiceCatalog(),
  });
}
