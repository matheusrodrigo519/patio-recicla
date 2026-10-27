import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:'frontend',base:'/patio-recicla/',plugins:[react()],build:{outDir:'../docs',emptyOutDir:true},css:{postcss:{plugins:[]}}});
