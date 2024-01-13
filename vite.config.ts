import { defineConfig } from 'vite'

export default defineConfig({
    build: {
        lib: {
            // todo multiple entry support
            entry: './core'
        }
    }
})