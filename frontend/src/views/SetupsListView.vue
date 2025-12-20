<template>
  <div class="min-h-screen p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold">Setups</h1>
        <Button @click="handleCreateSetup" variant="primary">
          Nuevo Setup
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

          <!-- Filtro por estrategia -->
          <div>
            <Label for="strategyFilter">Estrategia</Label>
            <Select
              id="strategyFilter"
              v-model="filters.strategyId"
              placeholder="Todas las estrategias"
              class="mt-1"
              @change="handleFilterChange"
            >
              <option value="">Todas las estrategias</option>
              <option
                v-for="strategy in strategiesStore.activeStrategies"
                :key="strategy.id"
                :value="strategy.id"
              >
                {{ strategy.name }}
              </option>
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
            <option :value="true">Activos</option>
            <option :value="false">Inactivos</option>
          </Select>
        </div>
      </Card>

      <!-- Tabla de setups -->
      <Card>
        <div v-if="setupsStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="setupsStore.setups.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            No hay setups registrados
          </p>
          <Button @click="handleCreateSetup" variant="primary">
            Crear primer setup
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
                  Estrategia
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Tags
                </th>
                <th class="text-left py-3 px-4 text-text-secondary text-sm font-medium">
                  Reglas
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
                v-for="setup in setupsStore.setups"
                :key="setup.id"
                class="border-b border-border hover:bg-background-secondary transition-colors"
              >
                <td class="py-4 px-4">
                  <div class="font-medium">{{ setup.name }}</div>
                  <div v-if="setup.description" class="text-sm text-text-secondary mt-1">
                    {{ truncate(setup.description, 60) }}
                  </div>
                </td>
                <td class="py-4 px-4">
                  <span v-if="setup.strategy" class="text-text-secondary">
                    {{ setup.strategy.name }}
                  </span>
                  <span v-else class="text-text-secondary italic">Sin estrategia</span>
                </td>
                <td class="py-4 px-4">
                  <div v-if="setup.suggestedTags && setup.suggestedTags.length > 0" class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in setup.suggestedTags"
                      :key="tag"
                      class="px-2 py-1 bg-info/20 text-info text-xs rounded"
                    >
                      {{ tag }}
                    </span>
                  </div>
                  <span v-else class="text-text-secondary italic">-</span>
                </td>
                <td class="py-4 px-4">
                  <span class="text-text-secondary">
                    {{ setup.ruleCount || 0 }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <span
                    :class="[
                      'px-2 py-1 rounded-full text-xs font-medium',
                      setup.isActive
                        ? 'bg-success/20 text-success'
                        : 'bg-text-secondary/20 text-text-secondary',
                    ]"
                  >
                    {{ setup.isActive ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleView(setup.id)"
                    >
                      Ver
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleEdit(setup.id)"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      @click="handleDelete(setup.id)"
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
          v-if="setupsStore.pagination.totalPages > 1"
          class="mt-6 flex justify-between items-center"
        >
          <div class="text-sm text-text-secondary">
            Mostrando {{ (setupsStore.pagination.page - 1) * setupsStore.pagination.limit + 1 }} -
            {{ Math.min(setupsStore.pagination.page * setupsStore.pagination.limit, setupsStore.pagination.total) }}
            de {{ setupsStore.pagination.total }}
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              :disabled="setupsStore.pagination.page === 1"
              @click="handlePageChange(setupsStore.pagination.page - 1)"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              :disabled="setupsStore.pagination.page === setupsStore.pagination.totalPages"
              @click="handlePageChange(setupsStore.pagination.page + 1)"
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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSetupsStore } from '@/stores/setups';
import { useStrategiesStore } from '@/stores/strategies';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const router = useRouter();
const setupsStore = useSetupsStore();
const strategiesStore = useStrategiesStore();

const searchQuery = ref('');
const filters = ref({
  strategyId: '',
  isActive: undefined as boolean | undefined,
});

let searchTimeout: ReturnType<typeof setTimeout>;

const handleSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    setupsStore.fetchSetups({
      search: searchQuery.value || undefined,
      ...filters.value,
      page: 1,
    });
  }, 500);
};

const handleFilterChange = () => {
  setupsStore.fetchSetups({
    search: searchQuery.value || undefined,
    ...filters.value,
    page: 1,
  });
};

const handlePageChange = (page: number) => {
  setupsStore.fetchSetups({
    search: searchQuery.value || undefined,
    ...filters.value,
    page,
  });
};

const handleCreateSetup = () => {
  router.push({ name: 'CreateSetup' });
};

const handleView = (id: string) => {
  router.push({ name: 'SetupDetail', params: { id } });
};

const handleEdit = (id: string) => {
  router.push({ name: 'EditSetup', params: { id } });
};

const handleDelete = async (id: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar este setup?')) {
    try {
      await setupsStore.deleteSetup(id);
    } catch (error) {
      console.error('Error al eliminar setup:', error);
    }
  }
};

const truncate = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

onMounted(async () => {
  await strategiesStore.fetchStrategies();
  await setupsStore.fetchSetups();
});
</script>

