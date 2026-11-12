/**
 * Register every skill module here.
 *
 * Add a new skill later:
 * 1) create modules/yourSkill.js
 * 2) import it below
 * 3) registerSkill(yourSkill)
 *
 * Existing modules stay untouched.
 */

import { registerSkill } from "../registry.js";
import humanSpeechSkill from "./humanSpeech.js";
import humanReadableOutputSkill from "./humanReadableOutput.js";
import songSearchSkill from "./songSearch.js";

let booted = false;

export function bootSkills() {
  if (booted) return;
  registerSkill(humanSpeechSkill);
  registerSkill(humanReadableOutputSkill);
  registerSkill(songSearchSkill);
  // registerSkill(recipeSearchSkill);
  booted = true;
}
