import { defineStore } from '#q-app'
import { createPinia } from 'pinia'

export const pinia = createPinia()

export default defineStore(() => pinia)
