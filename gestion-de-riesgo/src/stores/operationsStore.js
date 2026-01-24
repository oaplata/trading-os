import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  createOperation,
  updateOperation,
  deleteOperation,
  getOperations
} from '@/services/operations'
import { getEvents } from '@/services/events'
import { updateInitialCapital, getUserData as getUserDataService } from '@/services/user'
import { useAuthStore } from './authStore'

export const useOperationsStore = defineStore('operations', () => {
  const operations = ref([])
  const operationEvents = ref({}) // Map: operationId -> events[]
  const loading = ref(false)
  const statusFilter = ref('ALL')

  const authStore = useAuthStore()

  // Calcular remainingSizeUsd basado en eventos
  const calculateRemainingSizeUsd = (operation, events = []) => {
    if (!operation.positionSizeUsd) return 0

    const closedSize = events
      .filter(e => ['PARTIAL_TP', 'FINAL_TP'].includes(e.type))
      .reduce((sum, e) => sum + (e.sizeUsd || 0), 0)

    return Math.max(0, operation.positionSizeUsd - closedSize)
  }

  // Determinar estado automáticamente basado en eventos
  const calculateStatusFromEvents = (operation, events = []) => {
    if (events.length === 0) {
      return operation.status || 'ABIERTA'
    }

    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date))
    const lastEvent = sortedEvents[sortedEvents.length - 1]

    // Estados finales (cerrados)
    if (lastEvent.type === 'STOPLOSS') return 'STOPLOSS'
    if (lastEvent.type === 'FINAL_TP') return 'CERRADA'
    if (lastEvent.type === 'CLOSE_BE') return 'CERRADA_BREAKEVEN'

    const remainingSize = calculateRemainingSizeUsd(operation, events)

    // Si no queda tamaño, debería estar cerrado (fallback)
    if (remainingSize <= 0) {
      // Revisar último evento de cierre
      const closeEvents = sortedEvents.filter(e => ['STOPLOSS', 'FINAL_TP', 'CLOSE_BE'].includes(e.type))
      if (closeEvents.length > 0) {
        const lastClose = closeEvents[closeEvents.length - 1]
        if (lastClose.type === 'STOPLOSS') return 'STOPLOSS'
        if (lastClose.type === 'FINAL_TP') return 'CERRADA'
        if (lastClose.type === 'CLOSE_BE') return 'CERRADA_BREAKEVEN'
      }
      return 'CERRADA' // fallback
    }

    // Si hay MOVE_TO_BE, estado es BREAKEVEN
    if (events.some(e => e.type === 'MOVE_TO_BE')) {
      return 'BREAKEVEN'
    }

    // Si hay PARTIAL_TP y queda tamaño => PARCIAL
    if (events.some(e => e.type === 'PARTIAL_TP')) {
      return 'PARCIAL'
    }

    // Por defecto ABIERTA
    return 'ABIERTA'
  }

  // Calcular riskUsd (solo si status == ABIERTA)
  const calculateRiskUsd = (operation, events = []) => {
    if (operation.status !== 'ABIERTA') return 0
    if (!operation.stopPrice || !operation.entryPrice) return 0

    const remainingSize = calculateRemainingSizeUsd(operation, events)
    if (remainingSize <= 0) return 0

    let risk = 0
    if (operation.direction === 'LONG') {
      risk = Math.abs((operation.entryPrice - operation.stopPrice) / operation.entryPrice) * remainingSize
    } else if (operation.direction === 'SHORT') {
      risk = Math.abs((operation.stopPrice - operation.entryPrice) / operation.entryPrice) * remainingSize
    }

    return risk
  }

  // Calcular totalRealizedUsd basado en eventos
  const calculateTotalRealizedUsd = (operation, events = []) => {
    if (!operation.entryPrice) return 0

    let realized = 0

    events
      .filter(e => ['PARTIAL_TP', 'FINAL_TP', 'STOPLOSS', 'CLOSE_BE'].includes(e.type) && e.price && e.sizeUsd)
      .forEach(event => {
        let pnl = 0
        if (operation.direction === 'LONG') {
          pnl = ((event.price / operation.entryPrice) - 1) * event.sizeUsd
        } else if (operation.direction === 'SHORT') {
          pnl = ((operation.entryPrice / event.price) - 1) * event.sizeUsd
        }
        realized += pnl
      })

    return realized
  }

  // Calcular totalFloatingUsd (solo si hay remainingSize > 0 y status abierto)
  const calculateTotalFloatingUsd = (operation, events = []) => {
    const status = calculateStatusFromEvents(operation, events)
    if (!['ABIERTA', 'BREAKEVEN', 'PARCIAL'].includes(status)) return 0
    if (!operation.currentPrice || !operation.entryPrice) return 0

    const remainingSize = calculateRemainingSizeUsd(operation, events)
    if (remainingSize <= 0) return 0

    let floating = 0
    if (operation.direction === 'LONG') {
      floating = ((operation.currentPrice / operation.entryPrice) - 1) * remainingSize
    } else if (operation.direction === 'SHORT') {
      floating = ((operation.entryPrice / operation.currentPrice) - 1) * remainingSize
    }

    return floating
  }

  // Operaciones con cálculos y eventos
  const operationsWithCalculations = computed(() => {
    return operations.value.map(op => {
      const events = operationEvents.value[op.id] || []
      const effectiveStatus = calculateStatusFromEvents(op, events)
      const remainingSize = calculateRemainingSizeUsd(op, events)

      return {
        ...op,
        status: effectiveStatus,
        events,
        remainingSizeUsd: remainingSize,
        riskUsd: calculateRiskUsd({ ...op, status: effectiveStatus }, events),
        totalRealizedUsd: calculateTotalRealizedUsd(op, events),
        totalFloatingUsd: calculateTotalFloatingUsd(op, events)
      }
    })
  })

  // Operaciones filtradas
  const filteredOperations = computed(() => {
    if (statusFilter.value === 'ALL') {
      return operationsWithCalculations.value
    }
    return operationsWithCalculations.value.filter(op => op.status === statusFilter.value)
  })

  // Resumen calculado
  const summary = computed(() => {
    const initialCapital = authStore.userData?.initialCapital || 0

    // Ganancias realizadas (todas las operaciones con eventos de cierre)
    const totalRealizedUsd = operationsWithCalculations.value
      .reduce((sum, op) => sum + op.totalRealizedUsd, 0)

    const realizedPercentage = initialCapital > 0 ? (totalRealizedUsd / initialCapital) * 100 : 0
    const capitalized = initialCapital + totalRealizedUsd

    // Ganancias flotantes (solo operaciones con remainingSize > 0)
    const totalFloatingUsd = operationsWithCalculations.value
      .filter(op => op.remainingSizeUsd > 0)
      .reduce((sum, op) => sum + op.totalFloatingUsd, 0)

    const floatingPercentage = capitalized > 0 ? (totalFloatingUsd / capitalized) * 100 : 0
    const floatingCapital = capitalized + totalFloatingUsd

    // Riesgo global (solo ABIERTA)
    const totalRiskUsd = operationsWithCalculations.value
      .filter(op => op.status === 'ABIERTA')
      .reduce((sum, op) => sum + op.riskUsd, 0)

    const riskPercentage = capitalized > 0 ? (totalRiskUsd / capitalized) * 100 : 0

    return {
      initialCapital,
      totalRealizedUsd,
      realizedPercentage,
      capitalized,
      totalFloatingUsd,
      floatingPercentage,
      floatingCapital,
      totalRiskUsd,
      riskPercentage
    }
  })

  // Cargar eventos para una operación
  const loadEventsForOperation = async (operationId) => {
    if (!authStore.user) return []

    try {
      const events = await getEvents(authStore.user.uid, operationId)
      operationEvents.value[operationId] = events
      return events
    } catch (error) {
      // Si no hay permisos o la subcolección no existe, retornar array vacío silenciosamente
      if (error.code === 'permission-denied' || error.code === 'missing-or-insufficient-permissions') {
        // Silenciar error de permisos - las reglas de Firestore deben ser actualizadas
        operationEvents.value[operationId] = []
        return []
      }
      // Solo mostrar otros errores si no son de permisos
      console.warn('Error cargando eventos (se usará array vacío):', error.message || error)
      operationEvents.value[operationId] = []
      return []
    }
  }

  // Cargar eventos para todas las operaciones (lazy, solo cuando se necesitan)
  const loadAllEvents = async () => {
    if (!authStore.user) return

    const promises = operations.value.map(op => loadEventsForOperation(op.id))
    await Promise.all(promises)
  }

  const loadOperations = async () => {
    if (!authStore.user) return

    loading.value = true
    try {
      operations.value = await getOperations(authStore.user.uid, statusFilter.value)
      // Cargar eventos para todas (puedes hacerlo lazy si quieres)
      await loadAllEvents()
    } catch (error) {
      console.error('Error cargando operaciones:', error)
    } finally {
      loading.value = false
    }
  }

  const addOperation = async (operationData) => {
    if (!authStore.user) return

    try {
      await createOperation(authStore.user.uid, operationData)
      await loadOperations()
    } catch (error) {
      console.error('Error creando operación:', error)
      throw error
    }
  }

  const editOperation = async (operationId, operationData) => {
    if (!authStore.user) return

    try {
      await updateOperation(authStore.user.uid, operationId, operationData)
      // Recargar eventos también por si acaso
      await loadEventsForOperation(operationId)
      await loadOperations()
    } catch (error) {
      console.error('Error editando operación:', error)
      throw error
    }
  }

  const removeOperation = async (operationId) => {
    if (!authStore.user) return

    try {
      await deleteOperation(authStore.user.uid, operationId)
      // Remover eventos del estado
      delete operationEvents.value[operationId]
      await loadOperations()
    } catch (error) {
      console.error('Error eliminando operación:', error)
      throw error
    }
  }

  const updateCapital = async (capital) => {
    if (!authStore.user) return

    try {
      await updateInitialCapital(authStore.user.uid, capital)
      const data = await getUserDataService(authStore.user.uid)
      if (data) {
        authStore.userData = data
      }
    } catch (error) {
      console.error('Error actualizando capital:', error)
      throw error
    }
  }

  const setStatusFilter = (filter) => {
    statusFilter.value = filter
    loadOperations()
  }

  return {
    operations: filteredOperations,
    loading,
    statusFilter,
    summary,
    loadOperations,
    loadEventsForOperation,
    loadAllEvents,
    addOperation,
    editOperation,
    removeOperation,
    updateCapital,
    setStatusFilter
  }
})
