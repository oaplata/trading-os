import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: () => import('@/views/ForgotPasswordView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('@/views/ResetPasswordView.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingWizard.vue'),
    meta: { requiresAuth: true, requiresOnboarding: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('@/views/AccountsListView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/accounts/new',
    name: 'CreateAccount',
    component: () => import('@/views/AccountFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/accounts/:id',
    name: 'AccountDetail',
    component: () => import('@/views/AccountDetailView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/accounts/:id/edit',
    name: 'EditAccount',
    component: () => import('@/views/AccountFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/cashflows',
    name: 'Cashflows',
    component: () => import('@/views/CashflowsView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/cashflows/new',
    name: 'CreateCashflow',
    component: () => import('@/views/CashflowFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/cashflows/:id/edit',
    name: 'EditCashflow',
    component: () => import('@/views/CashflowFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/instruments',
    name: 'Instruments',
    component: () => import('@/views/InstrumentsListView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/instruments/new',
    name: 'CreateInstrument',
    component: () => import('@/views/InstrumentFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/instruments/:id/edit',
    name: 'EditInstrument',
    component: () => import('@/views/InstrumentFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/strategies',
    name: 'Strategies',
    component: () => import('@/views/StrategiesListView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/strategies/new',
    name: 'CreateStrategy',
    component: () => import('@/views/StrategyFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/strategies/:id/edit',
    name: 'EditStrategy',
    component: () => import('@/views/StrategyFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/setups',
    name: 'Setups',
    component: () => import('@/views/SetupsListView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/setups/new',
    name: 'CreateSetup',
    component: () => import('@/views/SetupFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/setups/:id',
    name: 'SetupDetail',
    component: () => import('@/views/SetupDetailView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/setups/:id/edit',
    name: 'EditSetup',
    component: () => import('@/views/SetupFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/trades',
    name: 'Trades',
    component: () => import('@/views/TradesListView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/trades/new',
    name: 'CreateTrade',
    component: () => import('@/views/TradeFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/trades/:id',
    name: 'TradeDetail',
    component: () => import('@/views/TradeDetailView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/trades/:id/edit',
    name: 'EditTrade',
    component: () => import('@/views/TradeFormView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Route guards
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore();

  // Si la ruta requiere autenticación
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }

    // Si requiere onboarding completado
    if (to.meta.requiresOnboarding && !authStore.user?.settings?.onboardingCompleted) {
      return next({ name: 'Onboarding' });
    }
  }

  // Si la ruta requiere ser guest (no autenticado)
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    // Si el usuario ya completó onboarding, ir a dashboard
    if (authStore.user?.settings?.onboardingCompleted) {
      return next({ name: 'Dashboard' });
    }
    // Si no, ir a onboarding
    return next({ name: 'Onboarding' });
  }

  next();
});

export default router;

