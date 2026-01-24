<template>
  <div class="overflow-x-auto">
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50 sticky top-0">
        <tr>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Símbolo</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entrada</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stop</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Take Profit</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamaño (USD)</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Restante</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Actual</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Riesgo (USD)</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia Flotante</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ganancia Realizada</th>
          <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-for="operation in operations" :key="operation.id" class="hover:bg-gray-50">
          <td class="px-4 py-3 text-sm text-gray-900 font-medium">{{ operation.symbol }}</td>
          <td class="px-4 py-3 text-sm">
            <span
              :class="[
                'px-2 py-1 rounded text-xs font-medium',
                operation.direction === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              ]"
            >
              {{ operation.direction }}
            </span>
          </td>
          <td class="px-4 py-3 text-sm">
            <span
              :class="[
                'px-2 py-1 rounded text-xs font-medium',
                getStatusBadgeClass(operation.status)
              ]"
            >
              {{ getStatusLabel(operation.status) }}
            </span>
          </td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">{{ formatNumber(operation.entryPrice) }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">{{ formatNumber(operation.stopPrice) }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">{{ operation.takeProfitPrice ? formatNumber(operation.takeProfitPrice) : '-' }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">${{ formatNumber(operation.positionSizeUsd) }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">${{ formatNumber(operation.remainingSizeUsd || operation.positionSizeUsd) }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">{{ operation.currentPrice ? formatNumber(operation.currentPrice) : '-' }}</td>
          <td class="px-4 py-3 text-sm text-gray-900 tabular-nums">${{ formatNumber(operation.riskUsd) }}</td>
          <td class="px-4 py-3 text-sm tabular-nums" :class="operation.totalFloatingUsd >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
            {{ ['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(operation.status) ? `$${formatNumber(operation.totalFloatingUsd)}` : '-' }}
          </td>
          <td class="px-4 py-3 text-sm tabular-nums" :class="operation.totalRealizedUsd >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'">
            ${{ formatNumber(operation.totalRealizedUsd) }}
          </td>
          <td class="px-4 py-3 text-sm">
            <div class="flex gap-2 flex-wrap">
              <button
                @click="$emit('events', operation)"
                class="text-purple-600 hover:text-purple-800 font-medium text-xs sm:text-sm"
              >
                Eventos
              </button>
              <button
                @click="$emit('edit', operation)"
                class="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm"
              >
                Editar
              </button>
              <button
                @click="$emit('delete', operation.id)"
                class="text-red-600 hover:text-red-800 font-medium text-xs sm:text-sm"
              >
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="operations.length === 0" class="text-center py-12 text-gray-500">
      No hay operaciones. Crea tu primera operación.
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
