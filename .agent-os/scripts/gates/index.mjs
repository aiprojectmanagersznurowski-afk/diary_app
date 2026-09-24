import branch from './branch.mjs';
import scope from './scope.mjs';
import secrets from './secrets.mjs';
import aiBoundary from './ai-boundary.mjs';
import layers from './layers.mjs';
import native from './native.mjs';
import migrations from './migrations.mjs';
import prompts from './prompts.mjs';
import logging from './logging.mjs';
import adr from './adr.mjs';
import contracts from './contracts.mjs';
import checkpoints from './checkpoints.mjs';
import roadmap from './roadmap.mjs';
import handoff from './handoff.mjs';
import testsPresent from './tests-present.mjs';
import review from './review.mjs';
import commits from './commits.mjs';

export const GATES = Object.fromEntries(
  [branch, scope, secrets, aiBoundary, layers, native, migrations, prompts, logging, adr, contracts, checkpoints,
   roadmap, handoff, testsPresent, review, commits].map(g => [g.id, g]),
);
