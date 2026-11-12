/**
 * Clean model output for chat display:
 * remove LaTeX/markdown junk that looks broken in plain UI.
 */
export function formatBotText(raw: string): string {
  let text = String(raw || "");

  // Remove fenced code markers but keep content
  text = text.replace(/```[\w]*\n?([\s\S]*?)```/g, "$1");

  // Strip inline/block math wrappers
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  text = text.replace(/\$([^$\n]+)\$/g, "$1");
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, "$1");
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, "$1");

  // Common LaTeX commands -> readable text
  text = text.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");
  text = text.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  text = text.replace(/\\text\{([^{}]+)\}/g, "$1");
  text = text.replace(/\\left|\\right/g, "");
  text = text.replace(/\\,/g, " ");
  text = text.replace(/\\;/g, " ");
  text = text.replace(/\\ /g, " ");
  text = text.replace(/\\int/g, "∫");
  text = text.replace(/\\sum/g, "Σ");
  text = text.replace(/\\infty/g, "infinity");
  text = text.replace(/\\cdot/g, "*");
  text = text.replace(/\\times/g, "x");
  text = text.replace(/\\pm/g, "+/-");
  text = text.replace(/\\leq/g, "<=");
  text = text.replace(/\\geq/g, ">=");
  text = text.replace(/\\neq/g, "!=");
  text = text.replace(/\\to/g, "->");
  text = text.replace(/\\_/g, "_");
  text = text.replace(/\\([a-zA-Z]+)/g, "$1");

  // Markdown leftovers
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/`([^`]+)`/g, "$1");
  text = text.replace(/^\s*[-*]\s+/gm, "• ");

  // Cleanup
  text = text.replace(/[ \t]{2,}/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}
