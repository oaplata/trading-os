<template>
  <div class="p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Instrumentos</h1>
        <Button @click="handleCreateInstrument" variant="primary">
          Nuevo Instrumento
        </Button>
      </div>

      <!-- Filtros y Búsqueda -->
      <Card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <!-- Búsqueda -->
          <div class="md:col-span-2">
            <Label htmlFor="search">Buscar</Label>
            <Input
              id="search"
              v-model="searchQuery"
              placeholder="Buscar por nombre, símbolo o ticker..."
              class="mt-1"
              @keyup.enter="handleApplyFilters"
            />
          </div>

          <!-- Filtro por tipo -->
          <div>
            <Label htmlFor="typeFilter">Tipo</Label>
            <Select
              id="typeFilter"
              v-model="filters.type"
              placeholder="Todos los tipos"
              class="mt-1"
            >
              <option value="">Todos los tipos</option>
              <option value="CRYPTO">Crypto</option>
              <option value="STOCK">Stock</option>
              <option value="ETF">ETF</option>
              <option value="FOREX">Forex</option>
              <option value="FUTURES">Futures</option>
              <option value="OPTIONS">Options</option>
            </Select>
          </div>

          <!-- Filtro por estado -->
          <div>
            <Label htmlFor="statusFilter">Estado</Label>
            <Select
              id="statusFilter"
              v-model="filters.isActive"
              placeholder="Todos los estados"
              class="mt-1"
            >
              <option :value="undefined">Todos los estados</option>
              <option :value="true">Activo</option>
              <option :value="false">Inactivo</option>
            </Select>
          </div>
        </div>

        <!-- Filtro por mercado -->
        <div class="mt-4">
          <Label htmlFor="marketFilter">Mercado</Label>
          <Select
            id="marketFilter"
            v-model="filters.market"
            placeholder="Todos los mercados"
            class="mt-1 max-w-xs"
          >
            <option value="">Todos los mercados</option>
            <option v-for="market in uniqueMarkets" :key="market" :value="market">
              {{ market }}
            </option>
          </Select>
        </div>

        <!-- Botones de acción -->
        <div class="mt-4 flex gap-2">
          <Button variant="secondary" @click="handleApplyFilters">
            Aplicar Filtros
          </Button>
          <Button variant="ghost" @click="handleClearFilters">
            Limpiar
          </Button>
        </div>
      </Card>

      <!-- Tabla de instrumentos -->
      <Card>
        <div v-if="instrumentsStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="instrumentsStore.instruments.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            {{ searchQuery || hasFilters ? 'No se encontraron instrumentos' : 'No hay instrumentos registrados' }}
          </p>
          <Button v-if="!hasFilters" @click="handleCreateInstrument" variant="primary">
            Crear primer instrumento
          </Button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th
                  v-for="column in columns"
                  :key="column.key"
                  class="text-left py-3 px-4 text-text-secondary text-sm font-medium cursor-pointer hover:text-text transition-colors"
                  @click="handleSort(column.key)"
                >
                  <div class="flex items-center gap-2">
                    {{ column.label }}
                    <span v-if="sortColumn === column.key" class="text-info">
                      {{ sortDirection === 'asc' ? '↑' : '↓' }}
                    </span>
                  </div>
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="instrument in sortedInstruments"
                :key="instrument.id"
                class="border-b border-border hover:bg-background-secondary transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="font-mono text-info font-medium">{{ instrument.ticker }}</div>
                </td>
                <td class="py-3 px-4">
                  <div class="font-medium">{{ instrument.name }}</div>
                </td>
                <td class="py-3 px-4">
                  <Badge :variant="getInstrumentTypeVariant(instrument.type)">
                    {{ instrument.type }}
                  </Badge>
                </td>
                <td class="py-3 px-4 text-text-secondary">{{ instrument.market }}</td>
                <td class="py-3 px-4 text-text-secondary">{{ instrument.currencyQuote }}</td>
                <td class="py-3 px-4">
                  <Badge :variant="instrument.isActive ? 'success' : 'neutral'">
                    {{ instrument.isActive ? 'Activo' : 'Inactivo' }}
                  </Badge>
                </td>
                <td class="py-3 px-4 text-right whitespace-nowrap">
                  <div class="flex justify-end gap-2">
                    <button
                      class="px-2 py-1 text-sm text-neutral hover:text-neutral-dark transition-colors"
                      @click="handleEditInstrument(instrument.id)"
                    >
                      Editar
                    </button>
                    <button
                      v-if="instrument.isActive"
                      class="px-2 py-1 text-sm text-loss hover:text-loss-dark transition-colors"
                      @click="handleDeleteInstrument(instrument.id)"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <!-- Paginación -->
          <div
            v-if="instrumentsStore.pagination.totalPages > 1"
            class="flex justify-center items-center gap-4 mt-8"
          >
            <Button
              variant="secondary"
              :disabled="instrumentsStore.pagination.page <= 1"
              @click="handleChangePage(instrumentsStore.pagination.page - 1)"
            >
              Anterior
            </Button>
            <span class="text-text-secondary">
              Página {{ instrumentsStore.pagination.page }} de
              {{ instrumentsStore.pagination.totalPages }}
            </span>
            <Button
              variant="secondary"
              :disabled="instrumentsStore.pagination.page >= instrumentsStore.pagination.totalPages"
              @click="handleChangePage(instrumentsStore.pagination.page + 1)"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInstrumentsStore } from '@/stores/instruments';
import type { Instrument, InstrumentType } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Badge from '@/components/ui/Badge.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const router = useRouter();
const instrumentsStore = useInstrumentsStore();

// Estado local
const searchQuery = ref('');
const filters = ref({
  market: '',
  type: '' as InstrumentType | '',
  isActive: undefined as boolean | undefined,
  page: 1,
  limit: 50,
});
const sortColumn = ref<string | null>(null);
const sortDirection = ref<'asc' | 'desc'>('asc');

// Columnas de la tabla
const columns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'name', label: 'Nombre' },
  { key: 'type', label: 'Tipo' },
  { key: 'market', label: 'Mercado' },
  { key: 'currencyQuote', label: 'Moneda' },
  { key: 'isActive', label: 'Estado' },
];

// Computed
const uniqueMarkets = computed(() => {
  const markets = new Set(instrumentsStore.instruments.map((inst) => inst.market));
  return Array.from(markets).sort();
});

const hasFilters = computed(() => {
  return filters.value.market || filters.value.type || filters.value.isActive !== undefined || searchQuery.value;
});

const sortedInstruments = computed(() => {
  if (!sortColumn.value) {
    return instrumentsStore.instruments;
  }

  const sorted = [...instrumentsStore.instruments];
  sorted.sort((a, b) => {
    let aValue: any = a[sortColumn.value as keyof Instrument];
    let bValue: any = b[sortColumn.value as keyof Instrument];

    if (typeof aValue === 'string') {
      return sortDirection.value === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === 'boolean') {
      return sortDirection.value === 'asc' ? (aValue ? 1 : -1) : aValue ? -1 : 1;
    }

    return 0;
  });
  return sorted;
});

const getInstrumentTypeVariant = (type: InstrumentType) => {
  switch (type) {
    case 'CRYPTO':
      return 'info';
    case 'STOCK':
      return 'success';
    case 'ETF':
      return 'warning';
    case 'FOREX':
      return 'danger';
    case 'FUTURES':
      return 'neutral';
    case 'OPTIONS':
      return 'secondary';
    default:
      return 'secondary';
  }
};

// Handlers
const handleCreateInstrument = () => {
  router.push({ name: 'CreateInstrument' });
};

const handleEditInstrument = (id: string) => {
  router.push({ name: 'EditInstrument', params: { id } });
};

const handleDeleteInstrument = async (id: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar este instrumento? Esta acción no se puede deshacer.')) {
    try {
      await instrumentsStore.deleteInstrument(id);
      alert('Instrumento eliminado exitosamente.');
      await fetchInstruments();
    } catch (err) {
      alert(instrumentsStore.error || 'Error al eliminar el instrumento.');
    }
  }
};

const handleSort = (columnKey: string) => {
  if (sortColumn.value === columnKey) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortColumn.value = columnKey;
    sortDirection.value = 'asc';
  }
};

const handleApplyFilters = async () => {
  filters.value.search = searchQuery.value || undefined;
  filters.value.page = 1; // Resetear a la primera página
  await fetchInstruments();
};

const handleClearFilters = async () => {
  filters.value = {
    market: '',
    type: '' as InstrumentType | '',
    isActive: undefined,
    page: 1,
    limit: 50,
  };
  searchQuery.value = '';
  await fetchInstruments();
};

const handleChangePage = async (newPage: number) => {
  filters.value.page = newPage;
  await fetchInstruments();
};

const fetchInstruments = async () => {
  await instrumentsStore.fetchInstruments(filters.value);
};

// Lifecycle
onMounted(() => {
  fetchInstruments();
});
</script>

