import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let auth: Auth | null = null
let configurationError = ''
if (Object.values(config).every(value => typeof value === 'string' && value.trim())) {
  try { auth = getAuth(initializeApp(config)) }
  catch { configurationError = 'A configuração do Firebase é inválida. Revise as variáveis de ambiente e reinicie a aplicação.' }
} else {
  configurationError = 'O login precisa da configuração do Firebase. Preencha as variáveis de .env.local conforme o README e reinicie a aplicação.'
}

export const firebaseAuth = auth
export const firebaseConfigurationError = configurationError
