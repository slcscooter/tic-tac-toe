import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals here, so Testing Library can't register its own cleanup.
// Without this, each test's render stays mounted into the next test.
afterEach(cleanup);
