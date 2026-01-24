<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div class="flex-1">
            <h1 class="text-xl sm:text-2xl font-bold text-gray-900">Gestión de Riesgo</h1>
            <p class="text-xs sm:text-sm text-gray-600 mt-1">{{ authStore.userData?.email || authStore.user?.email }}</p>
          </div>
          <button
            @click="handleLogout"
            class="self-start sm:self-auto px-4 py-2 min-h-[44px] bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 active:bg-red-800"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Loading -->
      <div v-if="authStore.loading || operationsStore.loading" class="text-center py-12">
        <p class="text-gray-600">Cargando...</p>
      </div>

      <!-- Contenido Principal -->
      <div v-else class="space-y-8">
        <!-- Sección Resumen -->
        <section class="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 class="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">Resumen</h2>

          <!-- Capital Inicial -->
          <div class="mb-4 sm:mb-6">
            <label for="initialCapital" class="block text-sm font-medium text-gray-700 mb-2">
              Capital Inicial (USD)
            </label>
            <div class="flex flex-col sm:flex-row gap-2">
              <input
                id="initialCapital"
                v-model.number="localInitialCapital"
                type="number"
                step="0.01"
                min="0"
                @blur="updateCapital"
                :disabled="capitalSaving"
                class="flex-1 px-4 py-2 min-h-[44px] border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed tabular-nums"
              />
              <button
                @click="updateCapital"
                :disabled="capitalSaving"
                class="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-800"
              >
                {{ capitalSaving ? 'Guardando...' : 'Guardar' }}
              </button>
            </div>
          </div>

          <!-- Métricas -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <!-- Capital Inicial -->
            <div class="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
              <p class="text-xs sm:text-sm text-blue-600 font-medium mb-1">Capital Inicial</p>
              <p class="text-lg sm:text-2xl font-bold text-blue-900 tabular-nums">${{ formatNumber(summary.initialCapital) }}</p>
            </div>

            <!-- Capitalizado -->
            <div class="bg-purple-50 p-3 sm:p-4 rounded-lg border border-purple-200">
              <p class="text-xs sm:text-sm text-purple-600 font-medium mb-1">Capitalizado</p>
              <p class="text-lg sm:text-2xl font-bold text-purple-900 tabular-nums">${{ formatNumber(summary.capitalized) }}</p>
            </div>

            <!-- Ganancias Realizadas -->
            <div class="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200">
              <p class="text-xs sm:text-sm text-green-600 font-medium mb-1">Ganancias Realizadas</p>
              <p class="text-lg sm:text-2xl font-bold tabular-nums" :class="summary.totalRealizedUsd >= 0 ? 'text-green-900' : 'text-red-900'">
                ${{ formatNumber(summary.totalRealizedUsd) }}
              </p>
              <p class="text-xs sm:text-sm text-gray-600 mt-1 tabular-nums">
                {{ formatNumber(summary.realizedPercentage, 2) }}%
              </p>
            </div>

            <!-- Ganancias Flotantes -->
            <div class="bg-yellow-50 p-3 sm:p-4 rounded-lg border border-yellow-200">
              <p class="text-xs sm:text-sm text-yellow-600 font-medium mb-1">Ganancias Flotantes</p>
              <p class="text-lg sm:text-2xl font-bold tabular-nums" :class="summary.totalFloatingUsd >= 0 ? 'text-green-900' : 'text-red-900'">
                ${{ formatNumber(summary.totalFloatingUsd) }}
              </p>
              <p class="text-xs sm:text-sm text-gray-600 mt-1 tabular-nums">
                {{ formatNumber(summary.floatingPercentage, 2) }}%
              </p>
            </div>

            <!-- Capital Flotante -->
            <div class="bg-indigo-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
              <p class="text-xs sm:text-sm text-indigo-600 font-medium mb-1">Capital Flotante</p>
              <p class="text-lg sm:text-2xl font-bold text-indigo-900 tabular-nums">${{ formatNumber(summary.floatingCapital) }}</p>
            </div>

            <!-- Riesgo Global -->
            <div class="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
              <p class="text-xs sm:text-sm text-red-600 font-medium mb-1">Riesgo Global</p>
              <p class="text-lg sm:text-2xl font-bold text-red-900 tabular-nums">${{ formatNumber(summary.totalRiskUsd) }}</p>
              <p class="text-xs sm:text-sm text-gray-600 mt-1 tabular-nums">
                {{ formatNumber(summary.riskPercentage, 2) }}%
              </p>
            </div>
          </div>
        </section>

        <!-- Sección Operaciones -->
        <section class="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900">Operaciones</h2>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
              <!-- Filtros -->
              <select
                v-model="operationsStore.statusFilter"
                @change="operationsStore.loadOperations()"
                class="px-3 py-2 min-h-[44px] border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ALL">Todas</option>
                <option value="ABIERTA">Abiertas</option>
                <option value="BREAKEVEN">Breakeven</option>
                <option value="PARCIAL">Parciales</option>
                <option value="STOPLOSS">Stop Loss</option>
                <option value="CERRADA">Cerradas</option>
                <option value="CERRADA_BREAKEVEN">Cerradas BE</option>
              </select>

              <!-- Botón Crear -->
              <button
                @click="showCreateModal = true"
                class="w-full sm:w-auto px-4 py-2 min-h-[44px] bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 active:bg-green-800"
              >
                + Nueva Operación
              </button>
            </div>
          </div>

          <!-- Vista Desktop: Tabla -->
          <div class="hidden sm:block overflow-x-auto">
            <OperationsTable
              :operations="operationsStore.operations"
              :formatNumber="formatNumber"
              @edit="editOperation"
              @delete="confirmDelete"
              @events="showEvents"
            />
          </div>

          <!-- Vista Mobile: Cards -->
          <div class="block sm:hidden">
            <OperationsCards
              :operations="operationsStore.operations"
              :formatNumber="formatNumber"
              @edit="editOperation"
              @delete="confirmDelete"
              @events="showEvents"
            />
          </div>
        </section>
      </div>
    </main>

    <!-- Modal Crear/Editar Operación -->
    <OperationModal
      v-if="showCreateModal || editingOperation"
      :operation="editingOperation"
      @close="closeModal"
      @save="handleSaveOperation"
    />

    <!-- Modal de Eventos -->
    <div
      v-if="showingEvents"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="closeEventsModal"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-900">Eventos - {{ selectedOperationForEvents?.symbol }}</h2>
            <button
              @click="closeEventsModal"
              class="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <EventsList
            v-if="selectedOperationForEvents"
            :operation="selectedOperationForEvents"
            :events="selectedOperationForEvents.events || []"
            :formatNumber="formatNumber"
            @add-event="showEventModal = true"
            @edit-event="editEvent"
            @delete-event="confirmDeleteEvent"
            @quick-action="handleQuickAction"
          />
        </div>
      </div>
    </div>

    <!-- Modal Crear/Editar Evento -->
    <EventModal
      v-if="showEventModal"
      :event="editingEvent"
      :operation="selectedOperationForEvents"
      @close="closeEventModal"
      @save="handleSaveEvent"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useOperationsStore } from '@/stores/operationsStore'
import OperationModal from '@/components/OperationModal.vue'
import OperationsTable from '@/components/OperationsTable.vue'
import OperationsCards from '@/components/OperationsCards.vue'
import EventsList from '@/components/EventsList.vue'
import EventModal from '@/components/EventModal.vue'
import { createEvent, updateEvent, deleteEvent } from '@/services/events'

const router = useRouter()
const authStore = useAuthStore()
const operationsStore = useOperationsStore()

const showCreateModal = ref(false)
const editingOperation = ref(null)
const localInitialCapital = ref(0)
const capitalSaving = ref(false)
const showingEvents = ref(false)
const selectedOperationForEvents = ref(null)
const showEventModal = ref(false)
const editingEvent = ref(null)

const summary = computed(() => operationsStore.summary)

watch(() => authStore.userData?.initialCapital, (newVal) => {
  if (newVal !== undefined) {
    localInitialCapital.value = newVal
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.isAuthenticated) {
    if (authStore.userData?.initialCapital !== undefined) {
      localInitialCapital.value = authStore.userData.initialCapital
    }
    await operationsStore.loadOperations()
  }
})

const handleLogout = async () => {
  await authStore.logoutUser()
  router.push('/login')
}

const updateCapital = async () => {
  if (localInitialCapital.value < 0) {
    alert('El capital inicial no puede ser negativo')
    localInitialCapital.value = authStore.userData?.initialCapital || 0
    return
  }

  capitalSaving.value = true
  try {
    await operationsStore.updateCapital(localInitialCapital.value)
    // Feedback visual breve
    setTimeout(() => {
      capitalSaving.value = false
    }, 500)
  } catch (error) {
    capitalSaving.value = false
    alert('Error al actualizar capital: ' + error.message)
  }
}

const editOperation = (operation) => {
  editingOperation.value = { ...operation }
  showCreateModal.value = false
}

const showEvents = async (operation) => {
  selectedOperationForEvents.value = operation
  // Cargar eventos si no están cargados
  if (!operation.events || operation.events.length === 0) {
    const events = await operationsStore.loadEventsForOperation(operation.id)
    selectedOperationForEvents.value = { ...operation, events }
  }
  showingEvents.value = true
}

const closeEventsModal = () => {
  showingEvents.value = false
  selectedOperationForEvents.value = null
  showEventModal.value = false
  editingEvent.value = null
}

const editEvent = (event) => {
  editingEvent.value = { ...event }
  showEventModal.value = true
}

const closeEventModal = () => {
  showEventModal.value = false
  editingEvent.value = null
}

const handleSaveEvent = async (eventData) => {
  if (!authStore.user || !selectedOperationForEvents.value) return

  try {
    if (editingEvent.value) {
      await updateEvent(authStore.user.uid, selectedOperationForEvents.value.id, editingEvent.value.id, eventData)
    } else {
      await createEvent(authStore.user.uid, selectedOperationForEvents.value.id, eventData)
    }
    // Recargar eventos y operaciones
    await operationsStore.loadEventsForOperation(selectedOperationForEvents.value.id)
    await operationsStore.loadOperations()
    const updatedOp = operationsStore.operations.find(op => op.id === selectedOperationForEvents.value.id)
    if (updatedOp) {
      selectedOperationForEvents.value = updatedOp
    }
    closeEventModal()
  } catch (error) {
    let errorMessage = 'Error al guardar evento: ' + error.message
    if (error.code === 'permission-denied' || error.code === 'missing-or-insufficient-permissions') {
      errorMessage = 'Error de permisos: Las reglas de Firestore no permiten modificar eventos.\n\n' +
        'Por favor, actualiza las reglas de Firestore en Firebase Console para incluir la subcolección "events".'
    }
    alert(errorMessage)
  }
}

const confirmDeleteEvent = async (eventId) => {
  if (!confirm('¿Estás seguro de eliminar este evento?')) return
  if (!authStore.user || !selectedOperationForEvents.value) return

  try {
    await deleteEvent(authStore.user.uid, selectedOperationForEvents.value.id, eventId)
    await operationsStore.loadEventsForOperation(selectedOperationForEvents.value.id)
    await operationsStore.loadOperations()
    const updatedOp = operationsStore.operations.find(op => op.id === selectedOperationForEvents.value.id)
    if (updatedOp) {
      selectedOperationForEvents.value = updatedOp
    }
  } catch (error) {
    let errorMessage = 'Error al eliminar evento: ' + error.message
    if (error.code === 'permission-denied' || error.code === 'missing-or-insufficient-permissions') {
      errorMessage = 'Error de permisos: Las reglas de Firestore no permiten eliminar eventos.\n\n' +
        'Por favor, actualiza las reglas de Firestore en Firebase Console para incluir la subcolección "events".'
    }
    alert(errorMessage)
  }
}

const handleQuickAction = async (type) => {
  if (!authStore.user || !selectedOperationForEvents.value) return

  const op = selectedOperationForEvents.value
  const remainingSize = op.remainingSizeUsd || op.positionSizeUsd

  let eventData = {
    type,
    date: new Date().toISOString().split('T')[0],
    price: null,
    sizeUsd: null
  }

  if (type === 'MOVE_TO_BE') {
    // No requiere price ni size
    eventData = { ...eventData, price: null, sizeUsd: null }
  } else if (type === 'CLOSE_BE') {
    eventData.price = op.entryPrice
    eventData.sizeUsd = remainingSize
  } else if (type === 'STOPLOSS') {
    eventData.price = op.stopPrice
    eventData.sizeUsd = remainingSize
  } else if (type === 'FINAL_TP') {
    // Necesitamos precio, mostrar modal
    editingEvent.value = null
    showEventModal.value = true
    return
  }

  try {
    await createEvent(authStore.user.uid, op.id, eventData)
    await operationsStore.loadEventsForOperation(op.id)
    await operationsStore.loadOperations()
    const updatedOp = operationsStore.operations.find(o => o.id === op.id)
    if (updatedOp) {
      selectedOperationForEvents.value = updatedOp
    }
  } catch (error) {
    let errorMessage = 'Error al crear evento: ' + error.message
    if (error.code === 'permission-denied' || error.code === 'missing-or-insufficient-permissions') {
      errorMessage = 'Error de permisos: Las reglas de Firestore no permiten crear eventos.\n\n' +
        'Por favor, actualiza las reglas de Firestore en Firebase Console para incluir la subcolección "events".\n\n' +
        'Ve a: Firestore Database → Rules y asegúrate de tener:\n' +
        'match /events/{eventId} {\n' +
        '  allow read, write: if request.auth != null && request.auth.uid == userId;\n' +
        '}'
    }
    alert(errorMessage)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  editingOperation.value = null
}

const handleSaveOperation = async (operationData) => {
  try {
    if (editingOperation.value) {
      await operationsStore.editOperation(editingOperation.value.id, operationData)
    } else {
      await operationsStore.addOperation(operationData)
    }
    closeModal()
  } catch (error) {
    alert('Error al guardar operación: ' + error.message)
  }
}

const confirmDelete = async (operationId) => {
  if (confirm('¿Estás seguro de eliminar esta operación?')) {
    try {
      await operationsStore.removeOperation(operationId)
    } catch (error) {
      alert('Error al eliminar operación: ' + error.message)
    }
  }
}

const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined) return '0.00'
  return Number(num).toFixed(decimals)
}
</script>
