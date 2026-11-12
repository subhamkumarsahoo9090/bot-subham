import { bootSkills } from "./modules/index.js";
import {
  buildSpeechPlan,
  getSkillsPrompt,
  listSkills,
  registerSkill,
  speakWithSkills,
  unregisterSkill,
  withSkillInstructions,
} from "./registry.js";
import createSkill from "./createSkill.js";

bootSkills();

export {
  buildSpeechPlan,
  createSkill,
  getSkillsPrompt,
  listSkills,
  registerSkill,
  speakWithSkills,
  unregisterSkill,
  withSkillInstructions,
};
