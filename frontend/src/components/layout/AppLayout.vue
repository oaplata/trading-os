<template>
  <div class="min-h-screen bg-background">
    <!-- Navbar -->
    <nav class="bg-background-secondary border-b border-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <!-- Logo y título -->
          <div class="flex items-center">
            <router-link :to="{ name: 'Dashboard' }" class="flex items-center space-x-2">
              <span class="text-2xl font-bold text-info">Trading OS</span>
            </router-link>
          </div>

          <!-- Navegación -->
          <div class="hidden md:flex items-center space-x-1">
            <router-link
              :to="{ name: 'Dashboard' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name === 'Dashboard'
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Dashboard
            </router-link>
            <router-link
              :to="{ name: 'Accounts' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Account')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Cuentas
            </router-link>
            <router-link
              :to="{ name: 'Cashflows' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Cashflow')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Cashflows
            </router-link>
            <router-link
              :to="{ name: 'Instruments' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Instrument')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Instrumentos
            </router-link>
            <router-link
              :to="{ name: 'Strategies' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Strategy')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Estrategias
            </router-link>
            <router-link
              :to="{ name: 'Setups' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Setup')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Setups
            </router-link>
            <router-link
              :to="{ name: 'Trades' }"
              class="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              :class="
                $route.name?.toString().startsWith('Trade')
                  ? 'bg-info/10 text-info'
                  : 'text-text-secondary hover:text-text hover:bg-background'
              "
            >
              Trades
            </router-link>
          </div>

          <!-- Usuario y logout -->
          <div class="flex items-center space-x-4">
            <div class="text-sm text-text-secondary">
              {{ authStore.user?.email }}
            </div>
            <button
              @click="handleLogout"
              class="px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Contenido principal -->
    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const handleLogout = async () => {
  await authStore.logout();
  router.push({ name: 'Login' });
};
</script>

