<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900">Eventos</h3>
      <button
        v-if="operation.remainingSizeUsd > 0 || !operation.events || operation.events.length === 0"
        @click="$emit('add-event')"
        class="px-3 py-2 min-h-[44px] bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 active:bg-green-800"
      >
        + Agregar Evento
      </button>
    </div>

    <!-- Lista de Eventos -->
    <div v-if="events && events.length > 0" class="space-y-2">
      <div
        v-for="event in sortedEvents"
        :key="event.id"
        class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span
                :class="[
                  'px-2 py-1 rounded text-xs font-medium',
                  getEventTypeBadgeClass(event.type)
                ]"
              >
                {{ getEventTypeLabel(event.type) }}
              </span>
              <span class="text-xs text-gray-500">{{ formatDate(event.date) }}</span>
            </div>
            <div v-if="event.price" class="text-gray-700 mb-1">
              <span class="font-medium">Precio:</span> <span class="tabular-nums">{{ formatNumber(event.price) }}</span>
            </div>
            <div v-if="event.sizeUsd" class="text-gray-700 mb-1">
              <span class="font-medium">Tamaño:</span> <span class="tabular-nums">${{ formatNumber(event.sizeUsd) }}</span>
            </div>
            <div v-if="event.note" class="text-gray-600 text-xs mt-1 italic">
              {{ event.note }}
            </div>
          </div>
          <div class="flex gap-2">
            <button
              @click="$emit('edit-event', event)"
              class="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Editar
            </button>
            <button
              @click="$emit('delete-event', event.id)"
              class="text-red-600 hover:text-red-800 text-xs font-medium"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
      <p class="text-sm">No hay eventos registrados.</p>
    </div>

    <!-- Acciones rápidas -->
    <div v-if="operation.remainingSizeUsd > 0 && operation.status === 'ABIERTA'" class="grid grid-cols-2 gap-2 pt-4 border-t border-gray-200">
      <button
        @click="quickAction('MOVE_TO_BE')"
        class="px-3 py-2 min-h-[44px] bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700"
      >
        Mover a Breakeven
      </button>
      <button
        @click="quickAction('CLOSE_BE')"
        class="px-3 py-2 min-h-[44px] bg-gray-600 text-white text-xs font-medium rounded-md hover:bg-gray-700"
      >
        Cerrar Breakeven
      </button>
      <button
        @click="quickAction('STOPLOSS')"
        class="px-3 py-2 min-h-[44px] bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700"
      >
        Stop Loss
      </button>
      <button
        @click="quickAction('FINAL_TP')"
        class="px-3 py-2 min-h-[44px] bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700"
      >
        Cerrar Final TP
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  operation: {
    type: Object,
    required: true
  },
  events: {
    type: Array,
    default: () => []
  },
  formatNumber: {
    type: Function,
    required: true
  }
})

const emit = defineEmits(['add-event', 'edit-event', 'delete-event', 'quick-action'])

const sortedEvents = computed(() => {
  if (!props.events || props.events.length === 0) return []
  return [...props.events].sort((a, b) => new Date(a.date) - new Date(b.date))
})

const getEventTypeLabel = (type) => {
  const labels = {
    'PARTIAL_TP': 'Toma Parcial',
    'FINAL_TP': 'Cierre Final',
    'STOPLOSS': 'Stop Loss',
    'MOVE_TO_BE': 'Mover a BE',
    'CLOSE_BE': 'Cerrar BE',
    'MANUAL_ADJUST': 'Ajuste Manual'
  }
  return labels[type] || type
}

const getEventTypeBadgeClass = (type) => {
  const classes = {
    'PARTIAL_TP': 'bg-yellow-100 text-yellow-800',
    'FINAL_TP': 'bg-green-100 text-green-800',
    'STOPLOSS': 'bg-red-100 text-red-800',
    'MOVE_TO_BE': 'bg-purple-100 text-purple-800',
    'CLOSE_BE': 'bg-gray-100 text-gray-800',
    'MANUAL_ADJUST': 'bg-blue-100 text-blue-800'
  }
  return classes[type] || 'bg-gray-100 text-gray-800'
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const quickAction = (type) => {
  emit('quick-action', type)
}
</script>
