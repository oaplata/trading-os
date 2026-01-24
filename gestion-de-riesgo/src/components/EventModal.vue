<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="close">
    <div class="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">
            {{ event ? 'Editar Evento' : 'Nuevo Evento' }}
          </h2>
          <button
            @click="close"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Tipo de Evento -->
          <div>
            <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Evento *
            </label>
            <select
              id="type"
              v-model="form.type"
              required
              @change="handleTypeChange"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccionar</option>
              <option value="PARTIAL_TP">Toma Parcial (Partial TP)</option>
              <option value="FINAL_TP">Cierre Final (Final TP)</option>
              <option value="STOPLOSS">Stop Loss</option>
              <option value="MOVE_TO_BE">Mover a Breakeven</option>
              <option value="CLOSE_BE">Cerrar en Breakeven</option>
              <option value="MANUAL_ADJUST">Ajuste Manual</option>
            </select>
          </div>

          <!-- Fecha -->
          <div>
            <label for="date" class="block text-sm font-medium text-gray-700 mb-2">
              Fecha *
            </label>
            <input
              id="date"
              v-model="form.date"
              type="date"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Precio (requerido para ciertos tipos) -->
          <div v-if="requiresPrice">
            <label for="price" class="block text-sm font-medium text-gray-700 mb-2">
              Precio *
            </label>
            <input
              id="price"
              v-model.number="form.price"
              type="number"
              step="0.00000001"
              min="0"
              :required="requiresPrice"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <!-- Tamaño (requerido para PARTIAL_TP y FINAL_TP) -->
          <div v-if="requiresSize">
            <label for="sizeUsd" class="block text-sm font-medium text-gray-700 mb-2">
              Tamaño Cerrado (USD) *
            </label>
            <input
              id="sizeUsd"
              v-model.number="form.sizeUsd"
              type="number"
              step="0.01"
              min="0"
              :required="requiresSize"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-500 mt-1">
              Tamaño restante disponible: ${{ formatNumber(remainingSize) }}
            </p>
          </div>

          <!-- Nota -->
          <div>
            <label for="note" class="block text-sm font-medium text-gray-700 mb-2">
              Nota
            </label>
            <textarea
              id="note"
              v-model="form.note"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nota opcional sobre el evento..."
            />
          </div>

          <!-- Error -->
          <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {{ error }}
          </div>

          <!-- Botones -->
          <div class="flex gap-4 pt-4">
            <button
              type="button"
              @click="close"
              class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {{ event ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'

const props = defineProps({
  event: {
    type: Object,
    default: null
  },
  operation: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'save'])

const error = ref('')
const form = reactive({
  type: '',
  date: new Date().toISOString().split('T')[0],
  price: null,
  sizeUsd: null,
  note: ''
})

const requiresPrice = computed(() => {
  return ['PARTIAL_TP', 'FINAL_TP', 'STOPLOSS', 'CLOSE_BE'].includes(form.type)
})

const requiresSize = computed(() => {
  return ['PARTIAL_TP', 'FINAL_TP'].includes(form.type)
})

const remainingSize = computed(() => {
  return props.operation?.remainingSizeUsd || props.operation?.positionSizeUsd || 0
})

watch(() => props.event, (evt) => {
  if (evt) {
    form.type = evt.type || ''
    form.date = evt.date ? (evt.date.split('T')[0] || evt.date) : new Date().toISOString().split('T')[0]
    form.price = evt.price || null
    form.sizeUsd = evt.sizeUsd || null
    form.note = evt.note || ''
  } else {
    form.type = ''
    form.date = new Date().toISOString().split('T')[0]
    form.price = null
    form.sizeUsd = null
    form.note = ''
  }
}, { immediate: true })

const handleTypeChange = () => {
  // Si es CLOSE_BE, usar entryPrice como precio predeterminado
  if (form.type === 'CLOSE_BE' && props.operation?.entryPrice) {
    form.price = props.operation.entryPrice
    form.sizeUsd = remainingSize.value
  }
  // Si es STOPLOSS, usar stopPrice
  else if (form.type === 'STOPLOSS' && props.operation?.stopPrice) {
    form.price = props.operation.stopPrice
    form.sizeUsd = remainingSize.value
  }
  // Si es FINAL_TP, usar remainingSize
  else if (form.type === 'FINAL_TP') {
    form.sizeUsd = remainingSize.value
  }
}

const validateForm = () => {
  error.value = ''

  if (requiresPrice.value && (!form.price || form.price <= 0)) {
    error.value = 'El precio es obligatorio y debe ser mayor a 0'
    return false
  }

  if (requiresSize.value && (!form.sizeUsd || form.sizeUsd <= 0)) {
    error.value = 'El tamaño es obligatorio y debe ser mayor a 0'
    return false
  }

  if (requiresSize.value && form.sizeUsd > remainingSize.value) {
    error.value = `El tamaño no puede ser mayor al tamaño restante ($${formatNumber(remainingSize.value)})`
    return false
  }

  return true
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  const eventData = {
    type: form.type,
    date: form.date,
    price: requiresPrice.value ? form.price : null,
    sizeUsd: requiresSize.value ? form.sizeUsd : null,
    note: form.note || null
  }

  emit('save', eventData)
}

const close = () => {
  emit('close')
}

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0.00'
  return Number(num).toFixed(decimals)
}
</script>
