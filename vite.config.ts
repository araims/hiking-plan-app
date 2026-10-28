import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // または '0.0.0.0' を指定することで外部からのアクセスを許可
    port: 5173, // 必要に応じて変更可能
  },
})