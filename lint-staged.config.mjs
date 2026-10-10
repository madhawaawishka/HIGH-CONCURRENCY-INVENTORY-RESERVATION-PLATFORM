/** Runs only on staged files so the pre-commit hook stays fast. */
export default {
  '*.{ts,mts,cts}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{js,mjs,cjs}': ['eslint --fix --max-warnings=0', 'prettier --write'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
