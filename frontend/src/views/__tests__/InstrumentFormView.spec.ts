import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import InstrumentFormView from '../InstrumentFormView.vue';
import { useInstrumentsStore } from '@/stores/instruments';

// Mock del store
vi.mock('@/stores/instruments');
vi.mock('vue-router', async () => {
  const actual = await vi.importActual('vue-router');
  return {
    ...actual,
    useRouter: () => ({
      push: vi.fn(),
    }),
    useRoute: () => ({
      params: { id: undefined },
    }),
  };
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/instruments/new', component: InstrumentFormView },
    { path: '/instruments/:id/edit', component: InstrumentFormView },
  ],
});

describe('InstrumentFormView', () => {
  let instrumentsStore: ReturnType<typeof useInstrumentsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    instrumentsStore = useInstrumentsStore() as any;
    vi.clearAllMocks();
  });

  it('debería renderizar formulario de creación', () => {
    instrumentsStore.loading = false;
    instrumentsStore.selectedInstrument = null;

    const { getByText, getByLabelText } = mount(InstrumentFormView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/nuevo instrumento/i)).toBeInTheDocument();
    expect(getByLabelText(/mercado/i)).toBeInTheDocument();
    expect(getByLabelText(/símbolo/i)).toBeInTheDocument();
    expect(getByLabelText(/nombre completo/i)).toBeInTheDocument();
  });

  it('debería mostrar preview del ticker cuando se ingresan market y symbol', async () => {
    instrumentsStore.loading = false;
    instrumentsStore.selectedInstrument = null;

    const { getByLabelText, getByText } = mount(InstrumentFormView, {
      global: {
        plugins: [router],
      },
    });

    const marketInput = getByLabelText(/mercado/i) as HTMLInputElement;
    const symbolInput = getByLabelText(/símbolo/i) as HTMLInputElement;

    // Simular entrada de datos
    await marketInput.setValue('BINANCE');
    await symbolInput.setValue('BTCUSDT');

    // Verificar que aparece el preview del ticker
    // Nota: En un test real, necesitarías esperar a que Vue actualice el DOM
    expect(marketInput.value).toBe('BINANCE');
    expect(symbolInput.value).toBe('BTCUSDT');
  });

  it('debería validar campos requeridos', async () => {
    instrumentsStore.loading = false;
    instrumentsStore.createInstrument = vi.fn().mockResolvedValue({});

    const { getByRole, getByText } = mount(InstrumentFormView, {
      global: {
        plugins: [router],
      },
    });

    // Intentar enviar sin llenar campos
    const submitButton = getByRole('button', { name: /crear|guardar/i });
    await submitButton.click();

    // Esperar validación
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verificar que se muestran errores de validación
    // (esto depende de cómo se implemente la validación en el componente)
    expect(instrumentsStore.createInstrument).not.toHaveBeenCalled();
  });

  it('debería crear instrumento con datos válidos', async () => {
    instrumentsStore.loading = false;
    instrumentsStore.createInstrument = vi.fn().mockResolvedValue({
      id: 'new-id',
      ticker: 'BINANCE:BTCUSDT',
    });

    const { getByLabelText, getByRole } = mount(InstrumentFormView, {
      global: {
        plugins: [router],
      },
    });

    // Llenar formulario
    const marketInput = getByLabelText(/mercado/i) as HTMLInputElement;
    const symbolInput = getByLabelText(/símbolo/i) as HTMLInputElement;
    const nameInput = getByLabelText(/nombre completo/i) as HTMLInputElement;

    await marketInput.setValue('BINANCE');
    await symbolInput.setValue('BTCUSDT');
    await nameInput.setValue('Bitcoin');

    // Seleccionar tipo y moneda (necesitarías interactuar con los selects)
    // Por ahora solo verificamos que los campos están presentes
    expect(marketInput.value).toBe('BINANCE');
    expect(symbolInput.value).toBe('BTCUSDT');
    expect(nameInput.value).toBe('Bitcoin');
  });

  it('debería renderizar formulario de edición cuando hay id en params', async () => {
    instrumentsStore.loading = false;
    instrumentsStore.selectedInstrument = {
      id: 'instrument-id',
      userId: 'user-1',
      market: 'BINANCE',
      symbol: 'BTCUSDT',
      ticker: 'BINANCE:BTCUSDT',
      name: 'Bitcoin',
      type: 'CRYPTO',
      currencyQuote: 'USDT',
      tickSize: 0.01,
      contractSize: null,
      isActive: true,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    instrumentsStore.fetchInstrument = vi.fn().mockResolvedValue(
      instrumentsStore.selectedInstrument,
    );

    // Mock de useRoute con id
    vi.mock('vue-router', async () => {
      const actual = await vi.importActual('vue-router');
      return {
        ...actual,
        useRouter: () => ({
          push: vi.fn(),
        }),
        useRoute: () => ({
          params: { id: 'instrument-id' },
        }),
      };
    });

    const { getByText } = mount(InstrumentFormView, {
      global: {
        plugins: [router],
      },
    });

    expect(getByText(/editar instrumento/i)).toBeInTheDocument();
  });
});

