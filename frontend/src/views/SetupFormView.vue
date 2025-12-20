<template>
  <div class="min-h-screen p-8">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleCancel"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a setups
        </button>
        <h1 class="text-3xl font-bold">
          {{ isEditMode ? 'Editar Setup' : 'Nuevo Setup' }}
        </h1>
      </div>

      <!-- Form -->
      <Card>
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Estrategia -->
          <div>
            <Label htmlFor="strategyId">Estrategia (Opcional)</Label>
            <Select id="strategyId" v-model="form.strategyId" class="mt-1" placeholder="Sin estrategia">
              <option value="">Sin estrategia</option>
              <option
                v-for="strategy in strategiesStore.activeStrategies"
                :key="strategy.id"
                :value="strategy.id"
              >
                {{ strategy.name }}
              </option>
            </Select>
            <p class="mt-1 text-sm text-text-secondary">
              Puedes asociar este setup a una estrategia o dejarlo independiente
            </p>
          </div>

          <!-- Nombre -->
          <div>
            <Input
              v-model="form.name"
              label="Nombre"
              placeholder="Ej: Breakout, Pullback, Reversal"
              required
              :error="errors.name"
            />
          </div>

          <!-- Descripción -->
          <div>
            <Textarea
              v-model="form.description"
              label="Descripción"
              placeholder="Descripción del setup..."
              :rows="4"
            />
          </div>

          <!-- Tags Sugeridos -->
          <div>
            <Label htmlFor="tags">Tags Sugeridos</Label>
            <Input
              id="tags"
              v-model="tagsInput"
              placeholder="Ej: breakout, momentum, resistance"
              hint="Separa los tags con comas"
              class="mt-1"
              @blur="handleTagsBlur"
            />
            <div v-if="tags.length > 0" class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="(tag, index) in tags"
                :key="index"
                class="px-2 py-1 bg-info/20 text-info text-sm rounded flex items-center gap-2"
              >
                {{ tag }}
                <button
                  type="button"
                  @click="removeTag(index)"
                  class="hover:text-info-dark"
                >
                  ×
                </button>
              </span>
            </div>
          </div>

          <!-- Notas -->
          <div>
            <Textarea
              v-model="form.notes"
              label="Notas"
              placeholder="Notas adicionales sobre el setup..."
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
import { useSetupsStore } from '@/stores/setups';
import { useStrategiesStore } from '@/stores/strategies';
import type { CreateSetupDto, UpdateSetupDto } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const route = useRoute();
const router = useRouter();
const setupsStore = useSetupsStore();
const strategiesStore = useStrategiesStore();

const isEditMode = computed(() => !!route.params.id);
const loading = ref(false);
const generalError = ref<string | null>(null);
const tags = ref<string[]>([]);
const tagsInput = ref('');

const form = ref<CreateSetupDto>({
  strategyId: '',
  name: '',
  description: '',
  suggestedTags: [],
  notes: '',
});

const errors = ref<Record<string, string>>({});

const handleTagsBlur = () => {
  if (tagsInput.value.trim()) {
    const newTags = tagsInput.value
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && !tags.value.includes(tag));
    tags.value = [...tags.value, ...newTags];
    tagsInput.value = '';
  }
};

const removeTag = (index: number) => {
  tags.value.splice(index, 1);
};

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
    const dto: CreateSetupDto | UpdateSetupDto = {
      strategyId: form.value.strategyId || undefined,
      name: form.value.name.trim(),
      description: form.value.description?.trim() || undefined,
      suggestedTags: tags.value,
      notes: form.value.notes?.trim() || undefined,
    };

    if (isEditMode.value) {
      await setupsStore.updateSetup(route.params.id as string, dto);
    } else {
      await setupsStore.createSetup(dto);
    }

    router.push({ name: 'Setups' });
  } catch (error: any) {
    generalError.value = error.response?.data?.message || 'Error al guardar setup';
  } finally {
    loading.value = false;
  }
};

const handleCancel = () => {
  router.push({ name: 'Setups' });
};

onMounted(async () => {
  await strategiesStore.fetchStrategies();

  if (isEditMode.value) {
    try {
      await setupsStore.fetchSetup(route.params.id as string);
      const setup = setupsStore.selectedSetup;
      if (setup) {
        form.value = {
          strategyId: setup.strategyId || '',
          name: setup.name,
          description: setup.description || '',
          suggestedTags: setup.suggestedTags || [],
          notes: setup.notes || '',
        };
        tags.value = setup.suggestedTags || [];
      }
    } catch (error) {
      router.push({ name: 'Setups' });
    }
  }
});
</script>

