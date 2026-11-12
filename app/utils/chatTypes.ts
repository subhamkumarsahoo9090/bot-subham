export type ChatHistoryItem = {
  role: "user" | "model";
  parts: { text: string }[];
};
