<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Estrategias</h1>
        <Button @click="handleCreateStrategy" variant="primary">
          Nueva Estrategia
        </Button>
      </div>

      <!-- Filtros y Búsqueda -->
      <Card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- Búsqueda -->
          <div class="md:col-span-2">
            <Label for="search">Buscar</Label>
            <Input
              id="search"
              v-model="searchQuery"
              placeholder="Buscar por nombre o descripción..."
              class="mt-1"
              @input="handleSearch"
            />
          </div>

          <!-- Filtro por mercado -->
          <div>
            <Label for="marketFilter">Mercado Objetivo</Label>
            <Select
              id="marketFilter"
              v-model="filters.targetMarket"
              placeholder="Todos los mercados"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todos los mercados</option>
              <option value="CRYPTO">Crypto</option>
              <option value="STOCKS">Stocks</option>
              <option value="FOREX">Forex</option>
              <option value="FUTURES">Futures</option>
            </Select>
          </div>
        </div>

        <!-- Filtro por estado -->
        <div class="mt-4">
          <Label for="statusFilter">Estado</Label>
          <Select
            id="statusFilter"
            v-model="filters.isActive"
            placeholder="Todos los estados"
            class="mt-1 max-w-xs"
            @change="handleFilterChange"
          >
            <option :value="undefined">Todos los estados</option>
            <option :value="true">Activas</option>
            <option :value="false">Inactivas</option>
          </Select>
        </div>
      </Card>

      <!-- Tabla de estrategias -->
      <Card>
        <div v-if="strategiesStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="strategiesStore.strategies.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            No hay estrategias registradas
          </p>
          <Button @click="handleCreateStrategy" variant="primary">
            Crear primera estrategia
          </Button>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Nombre
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Mercado
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Timeframe
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Setups
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Estado
                </th>
                <th class="text-right py-3 px-4 text-text-secondary text-sm font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="strategy in strategiesStore.strategies"
                :key="strategy.id"
                class="border-b border-border hover:bg-background-secondary transition-colors"
              >
                <td class="py-4 px-4">
                  <div class="font-medium">{{ strategy.name }}</div>
                  <div v-if="strategy.description" class="text-sm text-text-secondary mt-1">
                    {{ truncate(strategy.description, 60) }}
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span v-if="strategy.targetMarket" class="text-text-secondary">
                    {{ strategy.targetMarket }}
                  </span>
                  <span v-else class="text-text-secondary italic">-</span>
                </td>
                <td class="py-4 px-4">
                  <span v-if="strategy.typicalTimeframe" class="text-text-secondary">
                    {{ strategy.typicalTimeframe }}
                  </span>
                  <span v-else class="text-text-secondary italic">-</span>
                </td>
                <td class="py-4 px-4">
                  <span class="text-text-secondary">
                    {{ strategy.setupCount || 0 }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      strategy.isActive
                        ? 'bg-success/20 text-success'
                        : 'bg-text-secondary/20 text-text-secondary',
                    ]"
                  >
                    {{ strategy.isActive ? 'Activa' : 'Inactiva' }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleEdit(strategy.id)"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleDelete(strategy.id)"
                    >
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div
          v-if="strategiesStore.pagination.totalPages > 1"
          class="mt-6 flex justify-between items-center"
        >
          <div class="text-sm text-text-secondary">
            Mostrando {{ (strategiesStore.pagination.page - 1) * strategiesStore.pagination.limit + 1 }} -
            {{ Math.min(strategiesStore.pagination.page * strategiesStore.pagination.limit, strategiesStore.pagination.total) }}
            de {{ strategiesStore.pagination.total }}
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="strategiesStore.pagination.page === 1"
              @click="handlePageChange(strategiesStore.pagination.page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="strategiesStore.pagination.page === strategiesStore.pagination.totalPages"
              @click="handlePageChange(strategiesStore.pagination.page + 1)"
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
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStrategiesStore } from '@/stores/strategies';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const router = useRouter();
const strategiesStore = useStrategiesStore();

const searchQuery = ref('');
const filters = ref({
  targetMarket: '',
  isActive: undefined as boolean | undefined,
});

let searchTimeout: ReturnType<typeof setTimeout>;

const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    strategiesStore.fetchStrategies({
      search: searchQuery.value || undefined,
      ...filters.value,
      page: 1,
    });
  }, 500);
};

const handleFilterChange = () => {
  strategiesStore.fetchStrategies({
    search: searchQuery.value || undefined,
    ...filters.value,
    page: 1,
  });
};

const handlePageChange = (page: number) => {
  strategiesStore.fetchStrategies({
    search: searchQuery.value || undefined,
    ...filters.value,
    page,
  });
};

const handleCreateStrategy = () => {
  router.push({ name: 'CreateStrategy' });
};

const handleEdit = (id: string) => {
  router.push({ name: 'EditStrategy', params: { id } });
};

const handleDelete = async (id: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta estrategia?')) {
    try {
      await strategiesStore.deleteStrategy(id);
    } catch (error) {
      console.error('Error al eliminar estrategia:', error);
    }
  }
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

onMounted(() => {
  strategiesStore.fetchStrategies();
});
</script>

