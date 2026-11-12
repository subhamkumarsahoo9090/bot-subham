import ButUi from "./components/ButUi";
import bot from "./utils/bot";
import type { ChatHistoryItem } from "./utils/chatTypes";
import type { ChatRuntimeSettings } from "./utils/settings";

async function sendMessage(
  message: string,
  history: ChatHistoryItem[] = [],
  runtimeSettings?: ChatRuntimeSettings
) {
  "use server";
  return bot({
    message,
    history,
    model: runtimeSettings?.model,
    fallbackModel: runtimeSettings?.fallbackModel,
    useFallback: runtimeSettings?.useFallback,
    instruction: runtimeSettings?.systemInstruction,
    temperature: runtimeSettings?.temperature,
    maxOutputTokens: runtimeSettings?.maxOutputTokens,
  });
}

export default function Home() {
  return <ButUi sendMessage={sendMessage} />;
}
