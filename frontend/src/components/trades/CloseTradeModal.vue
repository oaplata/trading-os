<template>
  <Modal :show="true" @close="$emit('close')">
    <div class="p-6 max-w-2xl">
      <h2 class="text-2xl font-bold mb-4">Cerrar Trade</h2>

      <div v-if="trade?.openQuantity && trade.openQuantity > 0" class="p-4 bg-warning/20 border border-warning/30 rounded-md mb-4">
        <p class="text-warning text-sm">
          ⚠️ No se puede cerrar el trade. Cantidad abierta: {{ trade.openQuantity.toFixed(8) }}
        </p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Resultado -->
        <div>
          <Label htmlFor="result">Resultado *</Label>
          <div class="mt-1 flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="form.result"
                value="WIN"
                required
                class="text-primary"
              />
              <span>Win</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="form.result"
                value="LOSS"
                required
                class="text-primary"
              />
              <span>Loss</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="form.result"
                value="BREAK_EVEN"
                required
                class="text-primary"
              />
              <span>Break Even</span>
            </label>
          </div>
        </div>

        <!-- Emoción -->
        <div>
          <Label htmlFor="emotion">Emoción</Label>
          <Select id="emotion" v-model="form.emotion" class="mt-1">
            <option value="">Sin emoción</option>
            <option value="CALM">Calmado</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="ANXIOUS">Ansioso</option>
            <option value="GREEDY">Codicioso</option>
          </Select>
        </div>

        <!-- Checklist -->
        <div v-if="checklist.length > 0">
          <Label>Checklist</Label>
          <div class="mt-2 space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="item in checklist"
              :key="item.ruleId"
              class="flex items-start gap-3 p-3 border border-border rounded-md"
            >
              <input
                type="checkbox"
                v-model="item.completed"
                :id="`rule-${item.ruleId}`"
                class="mt-1"
              />
              <div class="flex-1">
                <label :for="`rule-${item.ruleId}`" class="cursor-pointer">
                  <p class="font-medium">{{ item.ruleName }}</p>
                  <p v-if="item.ruleDescription" class="text-sm text-text-secondary">
                    {{ item.ruleDescription }}
                  </p>
                </label>
                <Input
                  v-model="item.notes"
                  placeholder="Notas (opcional)"
                  class="mt-2"
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Lección Aprendida -->
        <div>
          <Textarea
            v-model="form.lessonLearned"
            label="Lección Aprendida"
            placeholder="¿Qué aprendiste de este trade?"
            :rows="4"
          />
        </div>

        <!-- Error -->
        <div v-if="generalError" class="p-3 bg-loss/20 border border-loss/30 rounded-md">
          <p class="text-loss text-sm">{{ generalError }}</p>
        </div>

        <!-- Botones -->
        <div class="flex justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="secondary" @click="$emit('close')">
            Cancelar
          </Button>
          <Button type="submit" variant="danger" :loading="loading">
            Cerrar Trade
          </Button>
        </div>
      </form>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTradesStore } from '@/stores/trades';
import { useTradeChecklistStore } from '@/stores/trade-checklist';
import type { Trade, CloseTradeDto, ChecklistItem } from '@/types';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Label from '@/components/ui/Label.vue';
import Select from '@/components/ui/Select.vue';
import Textarea from '@/components/ui/Textarea.vue';

const props = defineProps<{
  trade: Trade | null;
}>();

const emit = defineEmits<{
  close: [];
  closed: [];
}>();

const tradesStore = useTradesStore();
const checklistStore = useTradeChecklistStore();
const loading = ref(false);
const generalError = ref<string | null>(null);

const form = ref<CloseTradeDto>({
  result: 'WIN',
  emotion: undefined,
  lessonLearned: '',
  checklist: [],
});

const checklist = ref<Array<ChecklistItem & { notes?: string }>>([]);

const loadChecklist = async () => {
  if (!props.trade?.setupId) return;
  
  try {
    const items = await checklistStore.fetchChecklist(props.trade.id);
    checklist.value = items.map((item) => ({
      ...item,
      notes: item.notes || '',
    }));
  } catch (error) {
    console.error('Error loading checklist:', error);
  }
};

const handleSubmit = async () => {
  if (!props.trade) return;

  loading.value = true;
  generalError.value = null;

  try {
    const dto: CloseTradeDto = {
      ...form.value,
      checklist: checklist.value.map((item) => ({
        ruleId: item.ruleId,
        completed: item.completed,
        notes: item.notes || undefined,
      })),
    };

    await tradesStore.closeTrade(props.trade.id, dto);
    emit('closed');
  } catch (err: any) {
    generalError.value = err.response?.data?.message || 'Error al cerrar trade';
  } finally {
    loading.value = false;
  }
};

onMounted(async () => {
  if (props.trade?.setupId) {
    await loadChecklist();
  }
});
</script>

