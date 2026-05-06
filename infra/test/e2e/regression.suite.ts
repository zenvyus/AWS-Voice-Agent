/**
 * Regression Suite
 * Imports all phase E2E tests. Adding a phase means adding one import line.
 * Run with: pnpm test:regression
 */

// Phase 1: Networking
import './phase-01-networking/networking.test';

// Phase 2: Data Layer
import './phase-02-data-layer/data-layer.test';

// Phase 3: Connect & Media
import './phase-03-connect-media/connect-media.test';

// Phase 4: Orchestrator
import './phase-04-orchestrator/orchestrator.test';
