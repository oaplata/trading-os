<template>
  <div class="min-h-screen p-8">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          @click="handleBack"
          class="text-text-secondary hover:text-text mb-2 transition-colors"
        >
          ← Volver a setups
        </button>
        <div class="flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold">{{ setup?.name }}</h1>
            <p v-if="setup?.description" class="text-text-secondary mt-2">
              {{ setup.description }}
            </p>
          </div>
          <Button @click="handleEditSetup" variant="ghost">
            Editar Setup
          </Button>
        </div>
      </div>

      <!-- Información del Setup -->
      <Card class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p class="text-sm text-text-secondary">Estrategia</p>
            <p class="font-medium">
              {{ setup?.strategy?.name || 'Sin estrategia' }}
            </p>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Reglas</p>
            <p class="font-medium">{{ rules.length }}</p>
          </div>
          <div>
            <p class="text-sm text-text-secondary">Estado</p>
            <span
              :class="[
                'px-2 py-1 rounded-full text-xs font-medium',
                setup?.isActive
                  ? 'bg-success/20 text-success'
                  : 'bg-text-secondary/20 text-text-secondary',
              ]"
            >
              {{ setup?.isActive ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>
        <div v-if="setup?.suggestedTags && setup.suggestedTags.length > 0" class="mt-4">
          <p class="text-sm text-text-secondary mb-2">Tags Sugeridos</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in setup.suggestedTags"
              :key="tag"
              class="px-2 py-1 bg-info/20 text-info text-sm rounded"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </Card>

      <!-- Reglas -->
      <Card>
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-xl font-semibold">Reglas del Checklist</h2>
          <Button @click="showRuleForm = true" variant="primary">
            Agregar Regla
          </Button>
        </div>

        <div v-if="rulesStore.loading" class="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>

        <div v-else-if="rules.length === 0" class="text-center py-12">
          <p class="text-text-secondary text-lg mb-4">
            No hay reglas registradas para este setup
          </p>
          <Button @click="showRuleForm = true" variant="primary">
            Agregar primera regla
          </Button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(rule, index) in sortedRules"
            :key="rule.id"
            class="p-4 border border-border rounded-md hover:bg-background-secondary transition-colors"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-3">
                  <span class="text-text-secondary text-sm font-medium">
                    {{ index + 1 }}.
                  </span>
                  <div>
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ rule.name }}</span>
                      <span
                        v-if="rule.isRequired"
                        class="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded"
                      >
                        Requerida
                      </span>
                    </div>
                    <p v-if="rule.description" class="text-sm text-text-secondary mt-1">
                      {{ rule.description }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleEditRule(rule)"
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleDeleteRule(rule.id)"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- Formulario de Regla (Modal) -->
      <div
        v-if="showRuleForm"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        @click.self="closeRuleForm"
      >
        <Card class="w-full max-w-2xl">
          <h3 class="text-xl font-semibold mb-4">
            {{ editingRule ? 'Editar Regla' : 'Nueva Regla' }}
          </h3>
          <form @submit.prevent="handleSubmitRule" class="space-y-4">
            <Input
              v-model="ruleForm.name"
              label="Nombre de la Regla"
              placeholder="Ej: Price above EMA 20"
              required
            />
            <Textarea
              v-model="ruleForm.description"
              label="Descripción (Opcional)"
              placeholder="Descripción de la regla..."
              :rows="3"
            />
            <div class="grid grid-cols-2 gap-4">
              <Input
                v-model.number="ruleForm.order"
                type="number"
                label="Orden"
                placeholder="0"
                min="0"
              />
              <div class="flex items-end">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    v-model="ruleForm.isRequired"
                    type="checkbox"
                    class="w-4 h-4"
                  />
                  <span class="text-sm">Regla obligatoria</span>
                </label>
              </div>
            </div>
            <div class="flex justify-end gap-4 pt-4 border-t border-border">
              <Button type="button" variant="secondary" @click="closeRuleForm">
                Cancelar
              </Button>
              <Button type="submit" variant="primary" :loading="ruleLoading">
                {{ editingRule ? 'Actualizar' : 'Crear' }}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSetupsStore } from '@/stores/setups';
import { useRulesStore } from '@/stores/rules';
import type { CreateRuleDto, UpdateRuleDto, Rule } from '@/types';
import Card from '@/components/ui/Card.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Textarea from '@/components/ui/Textarea.vue';
import LoadingSpinner from '@/components/ui/LoadingSpinner.vue';

const route = useRoute();
const router = useRouter();
const setupsStore = useSetupsStore();
const rulesStore = useRulesStore();

const setup = computed(() => setupsStore.selectedSetup);
const rules = computed(() => rulesStore.rules.filter((r) => r.setupId === setup.value?.id));
const sortedRules = computed(() => {
  return [...rules.value].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
});

const showRuleForm = ref(false);
const editingRule = ref<Rule | null>(null);
const ruleLoading = ref(false);

const ruleForm = ref<CreateRuleDto>({
  setupId: '',
  name: '',
  description: '',
  order: 0,
  isRequired: false,
});

const handleBack = () => {
  router.push({ name: 'Setups' });
};

const handleEditSetup = () => {
  router.push({ name: 'EditSetup', params: { id: setup.value?.id } });
};

const handleEditRule = (rule: Rule) => {
  editingRule.value = rule;
  ruleForm.value = {
    setupId: rule.setupId,
    name: rule.name,
    description: rule.description || '',
    order: rule.order,
    isRequired: rule.isRequired,
  };
  showRuleForm.value = true;
};

const handleDeleteRule = async (id: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar esta regla?')) {
    try {
      await rulesStore.deleteRule(id);
      await rulesStore.fetchRulesBySetup(setup.value!.id);
    } catch (error) {
      console.error('Error al eliminar regla:', error);
    }
  }
};

const handleSubmitRule = async () => {
  if (!ruleForm.value.name.trim()) return;

  ruleLoading.value = true;

  try {
    if (editingRule.value) {
      const updateDto: UpdateRuleDto = {
        name: ruleForm.value.name.trim(),
        description: ruleForm.value.description?.trim() || undefined,
        order: ruleForm.value.order,
        isRequired: ruleForm.value.isRequired,
      };
      await rulesStore.updateRule(editingRule.value.id, updateDto);
    } else {
      const createDto: CreateRuleDto = {
        setupId: setup.value!.id,
        name: ruleForm.value.name.trim(),
        description: ruleForm.value.description?.trim() || undefined,
        order: ruleForm.value.order || 0,
        isRequired: ruleForm.value.isRequired || false,
      };
      await rulesStore.createRule(createDto);
    }
    await rulesStore.fetchRulesBySetup(setup.value!.id);
    closeRuleForm();
  } catch (error) {
    console.error('Error al guardar regla:', error);
  } finally {
    ruleLoading.value = false;
  }
};

const closeRuleForm = () => {
  showRuleForm.value = false;
  editingRule.value = null;
  ruleForm.value = {
    setupId: '',
    name: '',
    description: '',
    order: 0,
    isRequired: false,
  };
};

onMounted(async () => {
  const setupId = route.params.id as string;
  try {
    await setupsStore.fetchSetup(setupId);
    await rulesStore.fetchRulesBySetup(setupId);
  } catch (error) {
    router.push({ name: 'Setups' });
  }
});
</script>

