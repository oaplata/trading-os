import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { register, login, logout, onAuthChange, getUserData } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const userData = ref(null)
  const loading = ref(true)

  const unsubscribe = onAuthChange(async (firebaseUser) => {
    loading.value = true
    if (firebaseUser) {
      user.value = firebaseUser
      try {
        userData.value = await getUserData(firebaseUser.uid)
      } catch (error) {
        console.error('Error cargando datos de usuario:', error)
        userData.value = null
      }
    } else {
      user.value = null
      userData.value = null
    }
    loading.value = false
  })

  // Limpiar listener cuando el store se destruye (si es necesario)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (unsubscribe) unsubscribe()
    })
  }

  const isAuthenticated = computed(() => !!user.value)

  const registerUser = async (email, password) => {
    const newUser = await register(email, password)
    user.value = newUser
    userData.value = await getUserData(newUser.uid)
    return newUser
  }

  const loginUser = async (email, password) => {
    const loggedUser = await login(email, password)
    user.value = loggedUser
    userData.value = await getUserData(loggedUser.uid)
    return loggedUser
  }

  const logoutUser = async () => {
    await logout()
    user.value = null
    userData.value = null
  }

  return {
    user,
    userData,
    loading,
    isAuthenticated,
    registerUser,
    loginUser,
    logoutUser
  }
})
