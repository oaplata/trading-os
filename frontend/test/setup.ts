import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/vue';
import '@testing-library/jest-dom/vitest';

// Limpiar después de cada test
afterEach(() => {
  cleanup();
});

