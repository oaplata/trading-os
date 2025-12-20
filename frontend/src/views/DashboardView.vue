<template>
  <div class="p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Dashboard</h1>
      
      <!-- Cards de acceso rápido -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Accounts' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Cuentas</h3>
              <p class="text-text-secondary text-sm">
                Gestiona tus cuentas de trading
              </p>
            </div>
            <span class="text-3xl">📊</span>
          </div>
        </Card>

        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Cashflows' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Cashflows</h3>
              <p class="text-text-secondary text-sm">
                Registra depósitos y retiros
              </p>
            </div>
            <span class="text-3xl">💰</span>
          </div>
        </Card>

        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Instruments' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Instrumentos</h3>
              <p class="text-text-secondary text-sm">
                Catálogo de instrumentos
              </p>
            </div>
            <span class="text-3xl">📈</span>
          </div>
        </Card>

        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Strategies' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Estrategias</h3>
              <p class="text-text-secondary text-sm">
                Gestiona tus estrategias
              </p>
            </div>
            <span class="text-3xl">🎯</span>
          </div>
        </Card>

        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Setups' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Setups</h3>
              <p class="text-text-secondary text-sm">
                Patrones de trading
              </p>
            </div>
            <span class="text-3xl">📋</span>
          </div>
        </Card>

        <Card class="cursor-pointer hover:bg-background-secondary transition-colors" @click="router.push({ name: 'Trades' })">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold mb-2">Trades</h3>
              <p class="text-text-secondary text-sm">
                Operaciones de trading
              </p>
            </div>
            <span class="text-3xl">💹</span>
          </div>
        </Card>
      </div>

      <!-- Resumen rápido -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h2 class="text-xl font-semibold mb-4">Resumen de Cuentas</h2>
          <div v-if="accountsStore.loading" class="text-text-secondary">
            Cargando...
          </div>
          <div v-else-if="accountsStore.accounts.length === 0" class="text-text-secondary">
            <p class="mb-4">No tienes cuentas registradas aún.</p>
            <button
              @click="router.push({ name: 'CreateAccount' })"
              class="px-4 py-2 bg-info text-white rounded-md hover:bg-info-dark transition-colors"
            >
              Crear primera cuenta
            </button>
          </div>
          <div v-else>
            <p class="text-text-secondary mb-2">
              Total de cuentas: <strong class="text-text">{{ accountsStore.accounts.length }}</strong>
            </p>
            <p class="text-text-secondary mb-2">
              Cuentas activas: <strong class="text-text">{{ accountsStore.activeAccounts.length }}</strong>
            </p>
            <button
              @click="router.push({ name: 'Accounts' })"
              class="mt-4 text-info hover:text-info-dark transition-colors"
            >
              Ver todas →
            </button>
          </div>
        </Card>

        <Card>
          <h2 class="text-xl font-semibold mb-4">Acciones Rápidas</h2>
          <div class="space-y-2">
            <button
              @click="router.push({ name: 'CreateAccount' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              ➕ Crear nueva cuenta
            </button>
            <button
              @click="router.push({ name: 'CreateCashflow' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              💰 Registrar cashflow
            </button>
            <button
              @click="router.push({ name: 'Accounts' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              📊 Ver todas las cuentas
            </button>
            <button
              @click="router.push({ name: 'Cashflows' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              📈 Ver timeline de cashflows
            </button>
            <button
              @click="router.push({ name: 'Instruments' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              📈 Ver todos los instrumentos
            </button>
            <button
              @click="router.push({ name: 'CreateInstrument' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              ➕ Crear nuevo instrumento
            </button>
            <button
              @click="router.push({ name: 'Strategies' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              🎯 Ver estrategias
            </button>
            <button
              @click="router.push({ name: 'CreateStrategy' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              ➕ Crear nueva estrategia
            </button>
            <button
              @click="router.push({ name: 'Setups' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              📋 Ver setups
            </button>
            <button
              @click="router.push({ name: 'CreateSetup' })"
              class="w-full text-left px-4 py-2 rounded-md hover:bg-background-secondary transition-colors"
            >
              ➕ Crear nuevo setup
            </button>
          </div>
        </Card>
      </div>

      <!-- Resumen de Estrategias y Setups -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <h2 class="text-xl font-semibold mb-4">Resumen de Estrategias</h2>
          <div v-if="strategiesStore.loading" class="text-text-secondary">
            Cargando...
          </div>
          <div v-else-if="strategiesStore.strategies.length === 0" class="text-text-secondary">
            <p class="mb-4">No tienes estrategias registradas aún.</p>
            <button
              @click="router.push({ name: 'CreateStrategy' })"
              class="px-4 py-2 bg-info text-white rounded-md hover:bg-info-dark transition-colors"
            >
              Crear primera estrategia
            </button>
          </div>
          <div v-else>
            <p class="text-text-secondary mb-2">
              Total de estrategias: <strong class="text-text">{{ strategiesStore.strategies.length }}</strong>
            </p>
            <p class="text-text-secondary mb-2">
              Estrategias activas: <strong class="text-text">{{ strategiesStore.activeStrategies.length }}</strong>
            </p>
            <button
              @click="router.push({ name: 'Strategies' })"
              class="mt-4 text-info hover:text-info-dark transition-colors"
            >
              Ver todas →
            </button>
          </div>
        </Card>

        <Card>
          <h2 class="text-xl font-semibold mb-4">Resumen de Setups</h2>
          <div v-if="setupsStore.loading" class="text-text-secondary">
            Cargando...
          </div>
          <div v-else-if="setupsStore.setups.length === 0" class="text-text-secondary">
            <p class="mb-4">No tienes setups registrados aún.</p>
            <button
              @click="router.push({ name: 'CreateSetup' })"
              class="px-4 py-2 bg-info text-white rounded-md hover:bg-info-dark transition-colors"
            >
              Crear primer setup
            </button>
          </div>
          <div v-else>
            <p class="text-text-secondary mb-2">
              Total de setups: <strong class="text-text">{{ setupsStore.setups.length }}</strong>
            </p>
            <p class="text-text-secondary mb-2">
              Setups activos: <strong class="text-text">{{ setupsStore.activeSetups.length }}</strong>
            </p>
            <button
              @click="router.push({ name: 'Setups' })"
              class="mt-4 text-info hover:text-info-dark transition-colors"
            >
              Ver todos →
            </button>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAccountsStore } from '@/stores/accounts';
import { useStrategiesStore } from '@/stores/strategies';
import { useSetupsStore } from '@/stores/setups';
import Card from '@/components/ui/Card.vue';

const router = useRouter();
const accountsStore = useAccountsStore();
const strategiesStore = useStrategiesStore();
const setupsStore = useSetupsStore();

onMounted(() => {
  // Cargar datos para el resumen
  accountsStore.fetchAccounts().catch(() => {});
  strategiesStore.fetchStrategies().catch(() => {});
  setupsStore.fetchSetups().catch(() => {});
});
</script>

