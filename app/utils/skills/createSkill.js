/**
 * Create an instruction-only skill with minimal code.
 *
 * Example:
 *   export default createSkill({
 *     id: "recipe-search",
 *     name: "Recipe Search",
 *     instructions: `Your training rules here...`,
 *   });
 */

export function createSkill({
  id,
  name,
  instructions,
  priority = 5,
  enabled = true,
}) {
  if (!id) throw new Error("Skill id is required");
  if (!instructions?.trim()) throw new Error("Skill instructions are required");

  return {
    id,
    name: name || id,
    enabled,
    priority,
    getPromptRules() {
      return `
SKILL MODULE: ${name || id}
${instructions.trim()}
`.trim();
    },
  };
}

export default createSkill;
