<template>
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a estrategias
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Estrategia' : 'Nueva Estrategia' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Nombre -->
          <div>
            <Input
              v-model="form.name"
              label="Nombre"
              placeholder="Ej: Swing Trading Crypto"
              required
              :error="errors.name"
            />
          </div>

          <!-- Descripción -->
          <div>
            <Textarea
              v-model="form.description"
              label="Descripción"
              placeholder="Descripción detallada de la estrategia..."
              :rows="4"
            />
          </div>

          <!-- Mercado y Timeframe -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetMarket">Mercado Objetivo</Label>
              <Select id="targetMarket" v-model="form.targetMarket" class="mt-1" placeholder="Sin mercado específico">
                <option value="">Sin mercado específico</option>
                <option value="CRYPTO">Crypto</option>
                <option value="STOCKS">Stocks</option>
                <option value="FOREX">Forex</option>
                <option value="FUTURES">Futures</option>
              </Select>
            </div>

            <div>
              <Input
                v-model="form.typicalTimeframe"
                label="Timeframe Típico"
                placeholder="Ej: 4H, 1D, 1W"
                hint="Timeframe principal de la estrategia"
              />
            </div>
          </div>

          <!-- Notas -->
          <div>
            <Textarea
              v-model="form.notes"
              label="Notas"
              placeholder="Notas adicionales sobre la estrategia..."
              :rows="3"
            />
          </div>

          <!-- Error General -->
          <div v-if="generalError" class="p-4 bg-loss/20 border border-loss/30 rounded-md">
            <p class="text-loss text-sm">{{ generalError }}</p>
          </div>

          <!-- Botones -->
          <div class="flex justify-end gap-4 pt-4 border-t border-border">
            <Button type="button" variant="secondary" @click="handleCancel">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" :loading="loading">
              {{ isEditMode ? 'Actualizar' : 'Crear' }}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStrategiesStore } from '@/stores/strategies';
import type { CreateStrategyDto, UpdateStrategyDto } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const route = useRoute();
const router = useRouter();
const strategiesStore = useStrategiesStore();

const isEditMode = computed(() => !!route.params.id);
const loading = ref(false);
const generalError = ref<string | null>(null);

const form = ref<CreateStrategyDto>({
  name: '',
  description: '',
  targetMarket: '',
  typicalTimeframe: '',
  notes: '',
});

const errors = ref<Record<string, string>>({});

const validate = (): boolean => {
  errors.value = {};

  if (!form.value.name.trim()) {
    errors.value.name = 'El nombre es requerido';
    return false;
  }

  return true;
};

const handleSubmit = async () => {
  if (!validate()) return;

  loading.value = true;
  generalError.value = null;

  try {
    const dto: CreateStrategyDto | UpdateStrategyDto = {
      name: form.value.name.trim(),
      description: form.value.description?.trim() || undefined,
      targetMarket: form.value.targetMarket || undefined,
      typicalTimeframe: form.value.typicalTimeframe?.trim() || undefined,
      notes: form.value.notes?.trim() || undefined,
    };

    if (isEditMode.value) {
      await strategiesStore.updateStrategy(route.params.id as string, dto);
    } else {
      await strategiesStore.createStrategy(dto);
    }

    router.push({ name: 'Strategies' });
  } catch (error: any) {
    generalError.value = error.response?.data?.message || 'Error al guardar estrategia';
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.push({ name: 'Strategies' });
};

onMounted(async () => {
  if (isEditMode.value) {
    try {
      await strategiesStore.fetchStrategy(route.params.id as string);
      const strategy = strategiesStore.selectedStrategy;
      if (strategy) {
        form.value = {
          name: strategy.name,
          description: strategy.description || '',
          targetMarket: strategy.targetMarket || '',
          typicalTimeframe: strategy.typicalTimeframe || '',
          notes: strategy.notes || '',
        };
      }
    } catch (error) {
      router.push({ name: 'Strategies' });
    }
  }
});
</script>

