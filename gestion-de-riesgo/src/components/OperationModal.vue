<template>
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" @click.self="close">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">
            {{ operation ? 'Editar Operación' : 'Nueva Operación' }}
          </h2>
          <button
            @click="close"
            class="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Símbolo -->
            <div>
              <label for="symbol" class="block text-sm font-medium text-gray-700 mb-1">
                Símbolo/Ticker *
              </label>
              <input
                id="symbol"
                v-model="form.symbol"
                type="text"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="BTCUSDT"
              />
            </div>

            <!-- Dirección -->
            <div>
              <label for="direction" class="block text-sm font-medium text-gray-700 mb-1">
                Dirección *
              </label>
              <select
                id="direction"
                v-model="form.direction"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar</option>
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>

            <!-- Fecha de Apertura -->
            <div>
              <label for="openedAt" class="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Apertura *
              </label>
              <input
                id="openedAt"
                v-model="form.openedAt"
                type="date"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Estado (solo en edición si no tiene eventos) -->
            <div v-if="!operation || !hasEvents">
              <label for="status" class="block text-sm font-medium text-gray-700 mb-1">
                Estado Inicial *
              </label>
              <select
                id="status"
                v-model="form.status"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ABIERTA">ABIERTA</option>
                <option value="BREAKEVEN">BREAKEVEN</option>
                <option value="PARCIAL">PARCIAL</option>
                <option value="STOPLOSS">STOPLOSS</option>
                <option value="CERRADA">CERRADA</option>
                <option value="CERRADA_BREAKEVEN">CERRADA_BREAKEVEN</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">El estado se actualiza automáticamente con eventos</p>
            </div>
            <div v-else class="flex items-center justify-center h-10 text-sm text-gray-600 bg-gray-50 rounded-md border border-gray-200">
              Estado: <span class="font-semibold ml-2">{{ form.status }}</span>
            </div>

            <!-- Precio de Entrada -->
            <div>
              <label for="entryPrice" class="block text-sm font-medium text-gray-700 mb-1">
                Precio de Entrada *
              </label>
              <input
                id="entryPrice"
                v-model.number="form.entryPrice"
                type="number"
                step="0.00000001"
                min="0"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Stop Price -->
            <div>
              <label for="stopPrice" class="block text-sm font-medium text-gray-700 mb-1">
                Stop Price *
              </label>
              <input
                id="stopPrice"
                v-model.number="form.stopPrice"
                type="number"
                step="0.00000001"
                min="0"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Take Profit Price -->
            <div>
              <label for="takeProfitPrice" class="block text-sm font-medium text-gray-700 mb-1">
                Take Profit Price
              </label>
              <input
                id="takeProfitPrice"
                v-model.number="form.takeProfitPrice"
                type="number"
                step="0.00000001"
                min="0"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Tamaño de Posición -->
            <div>
              <label for="positionSizeUsd" class="block text-sm font-medium text-gray-700 mb-1">
                Tamaño de Posición (USD) *
              </label>
              <input
                id="positionSizeUsd"
                v-model.number="form.positionSizeUsd"
                type="number"
                step="0.01"
                min="0"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <!-- Precio Actual (solo operaciones abiertas) -->
            <div v-if="isOpenStatus(form.status)">
              <label for="currentPrice" class="block text-sm font-medium text-gray-700 mb-1">
                Precio Actual
              </label>
              <input
                id="currentPrice"
                v-model.number="form.currentPrice"
                type="number"
                step="0.00000001"
                min="0"
                class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p class="text-xs text-gray-500 mt-1">Necesario para calcular ganancia flotante</p>
            </div>
          </div>

          <!-- Notas -->
          <div>
            <label for="notes" class="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              id="notes"
              v-model="form.notes"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales sobre la operación..."
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
              {{ operation ? 'Actualizar' : 'Crear' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'

const props = defineProps({
  operation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const error = ref('')

const form = reactive({
  symbol: '',
  direction: '',
  status: 'ABIERTA',
  entryPrice: null,
  stopPrice: null,
  takeProfitPrice: null,
  positionSizeUsd: null,
  currentPrice: null,
  openedAt: new Date().toISOString().split('T')[0], // Fecha actual por defecto
  notes: ''
})

const hasEvents = ref(false)

// Cargar datos si es edición
watch(() => props.operation, async (op) => {
  if (op) {
    form.symbol = op.symbol || ''
    form.direction = op.direction || ''
    form.status = op.status || 'ABIERTA'
    form.entryPrice = op.entryPrice || null
    form.stopPrice = op.stopPrice || null
    form.takeProfitPrice = op.takeProfitPrice || null
    form.positionSizeUsd = op.positionSizeUsd || null
    form.currentPrice = op.currentPrice || null
    form.openedAt = op.openedAt ? (op.openedAt.split('T')[0] || op.openedAt) : new Date().toISOString().split('T')[0]
    form.notes = op.notes || ''
    
    // Verificar si tiene eventos (el componente padre debería pasar esto como prop)
    hasEvents.value = op.events && op.events.length > 0
  } else {
    // Reset form para nueva operación
    form.symbol = ''
    form.direction = ''
    form.status = 'ABIERTA'
    form.entryPrice = null
    form.stopPrice = null
    form.takeProfitPrice = null
    form.positionSizeUsd = null
    form.currentPrice = null
    form.openedAt = new Date().toISOString().split('T')[0]
    form.notes = ''
    hasEvents.value = false
  }
}, { immediate: true })

const isOpenStatus = (status) => {
  return ['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(status)
}

const validateForm = () => {
  error.value = ''

  if (form.entryPrice <= 0 || form.stopPrice <= 0 || form.positionSizeUsd <= 0) {
    error.value = 'Los precios y el tamaño de posición deben ser mayores a 0'
    return false
  }

  if (!form.openedAt) {
    error.value = 'La fecha de apertura es obligatoria'
    return false
  }

  if (form.takeProfitPrice && form.takeProfitPrice <= 0) {
    error.value = 'El precio de take profit debe ser mayor a 0'
    return false
  }

  if (form.currentPrice && form.currentPrice <= 0) {
    error.value = 'El precio actual debe ser mayor a 0'
    return false
  }

  return true
}

const handleSubmit = () => {
  if (!validateForm()) {
    return
  }

  const operationData = {
    symbol: form.symbol,
    direction: form.direction,
    status: form.status,
    entryPrice: form.entryPrice,
    stopPrice: form.stopPrice,
    takeProfitPrice: form.takeProfitPrice || null,
    positionSizeUsd: form.positionSizeUsd,
    currentPrice: isOpenStatus(form.status) ? (form.currentPrice || null) : null,
    openedAt: form.openedAt,
    notes: form.notes || null
  }
  
  // Si tiene eventos, no actualizar el estado manualmente (se actualiza con eventos)
  if (hasEvents.value) {
    delete operationData.status
  }

  emit('save', operationData)
}

const close = () => {
  emit('close')
}
</script>
