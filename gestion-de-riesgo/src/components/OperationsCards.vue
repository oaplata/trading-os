<template>
  <div class="space-y-3">
    <div
      v-for="operation in operations"
      :key="operation.id"
      class="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
    >
      <!-- Fila superior: Símbolo + Dirección + Estado -->
      <div class="flex items-center justify-between gap-2">
        <h3 class="text-base font-bold text-gray-900">{{ operation.symbol }}</h3>
        <div class="flex gap-2 flex-shrink-0">
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-medium',
              operation.direction === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            ]"
          >
            {{ operation.direction }}
          </span>
          <span
            :class="[
              'px-2 py-1 rounded text-xs font-medium',
              getStatusBadgeClass(operation.status)
            ]"
          >
            {{ getStatusLabel(operation.status) }}
          </span>
        </div>
      </div>

      <!-- Segunda fila: Entrada / Stop / Tamaño -->
      <div class="grid grid-cols-3 gap-2 text-sm">
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Entrada</p>
          <p class="font-semibold text-gray-900 tabular-nums">{{ formatNumber(operation.entryPrice) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Stop</p>
          <p class="font-semibold text-gray-900 tabular-nums">{{ formatNumber(operation.stopPrice) }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Tamaño</p>
          <p class="font-semibold text-gray-900 tabular-nums">${{ formatNumber(operation.positionSizeUsd) }}</p>
        </div>
      </div>

      <!-- Tamaño restante si hay diferencia -->
      <div v-if="operation.remainingSizeUsd !== operation.positionSizeUsd" class="text-sm bg-yellow-50 p-2 rounded border border-yellow-200">
        <p class="text-xs text-yellow-700 mb-0.5">Tamaño Restante</p>
        <p class="font-semibold text-yellow-900 tabular-nums">${{ formatNumber(operation.remainingSizeUsd) }}</p>
      </div>

      <!-- Tercera fila: Precio Actual (operaciones abiertas) -->
      <div v-if="['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(operation.status) && operation.currentPrice" class="text-sm">
        <p class="text-xs text-gray-500 mb-0.5">Precio Actual</p>
        <p class="font-semibold text-gray-900 tabular-nums">{{ formatNumber(operation.currentPrice) }}</p>
      </div>
      <div v-else-if="['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(operation.status) && !operation.currentPrice" class="text-xs text-orange-600 italic">
        ⚠️ Falta precio actual para calcular flotante
      </div>

      <!-- Cuarta fila: Métricas (Riesgo, Ganancia Flotante/Realizada) -->
      <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
        <div>
          <p class="text-xs text-gray-500 mb-0.5">Riesgo</p>
          <p class="text-sm font-semibold text-gray-900 tabular-nums">${{ formatNumber(operation.riskUsd) }}</p>
        </div>
        <div v-if="['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(operation.status)">
          <p class="text-xs text-gray-500 mb-0.5">Ganancia Flotante</p>
          <p
            class="text-sm font-semibold tabular-nums"
            :class="operation.totalFloatingUsd >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            ${{ formatNumber(operation.totalFloatingUsd) }}
          </p>
        </div>
        <div v-if="operation.totalRealizedUsd !== 0">
          <p class="text-xs text-gray-500 mb-0.5">Ganancia Realizada</p>
          <p
            class="text-sm font-semibold tabular-nums"
            :class="operation.totalRealizedUsd >= 0 ? 'text-green-600' : 'text-red-600'"
          >
            ${{ formatNumber(operation.totalRealizedUsd) }}
          </p>
        </div>
      </div>

      <!-- Acciones: Eventos, Editar y Eliminar -->
      <div class="flex flex-col gap-2 pt-2 border-t border-gray-200">
        <button
          @click="$emit('events', operation)"
          class="w-full min-h-[44px] px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 active:bg-purple-800"
        >
          Ver Eventos
        </button>
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="$emit('edit', operation)"
            class="min-h-[44px] px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 active:bg-blue-800"
          >
            Editar
          </button>
          <button
            @click="$emit('delete', operation.id)"
            class="min-h-[44px] px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 active:bg-red-800"
          >
            Eliminar
          </button>
        </div>
      </div>

      <!-- Take Profit (opcional, mostrado si existe) -->
      <div v-if="operation.takeProfitPrice" class="text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span class="font-medium">Take Profit:</span>
        <span class="tabular-nums ml-1">{{ formatNumber(operation.takeProfitPrice) }}</span>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-if="operations.length === 0" class="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-sm">No hay operaciones.</p>
      <p class="text-xs mt-1">Crea tu primera operación.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  operations: {
    type: Array,
    required: true
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

defineEmits(['edit', 'delete', 'events'])

const getStatusLabel = (status) => {
  const labels = {
    'ABIERTA': 'Abierta',
    'BREAKEVEN': 'Breakeven',
    'PARCIAL': 'Parcial',
    'STOPLOSS': 'Stop Loss',
    'CERRADA': 'Cerrada',
    'CERRADA_BREAKEVEN': 'Cerrada BE'
  }
  return labels[status] || status
}

const getStatusBadgeClass = (status) => {
  const classes = {
    'ABIERTA': 'bg-blue-100 text-blue-800',
    'BREAKEVEN': 'bg-purple-100 text-purple-800',
    'PARCIAL': 'bg-yellow-100 text-yellow-800',
    'STOPLOSS': 'bg-red-100 text-red-800',
    'CERRADA': 'bg-green-100 text-green-800',
    'CERRADA_BREAKEVEN': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}
</script>
