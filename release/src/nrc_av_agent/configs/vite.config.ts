/* eslint-disable import/no-extraneous-dependencies */
import { builtinModules } from 'module';
import { resolve } from 'path';
import React from '@vitejs/plugin-react';
import * as dotenv from 'dotenv';
import { defineConfig } from 'vite';
import Electron from 'vite-plugin-electron';
import EnvironmentPlugin from 'vite-plugin-environment';
import TsConfigPaths from 'vite-tsconfig-paths';

dotenv.config();

const isDebug = process.env.ELECTRON_ENV === 'debug';

export default defineConfig({
  base: './',
  clearScreen: false,
  publicDir: resolve('./src/renderer/public'),
  root: resolve('./src/renderer'),
  server: {
    port: Number(process.env.VITE_PORT)
  },
  build: {
    assetsDir: '',
    sourcemap: isDebug,
    outDir: resolve('./app/dist/renderer')
  },
  plugins: [
    React(),
    EnvironmentPlugin('all', { prefix: '' }),
    TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] }),
    Electron([
      {
        entry: './src/preload/preload.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page
          // when the Preload-Scripts build is complete,
          // instead of restarting the entire Electron App.
          options.reload();
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/preload')
          },
          plugins: [TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })]
        }
      },
      {
        entry: './src/main/main.ts',
        onstart: (options) => {
          options.startup(['.', '--no-sandbox', '--inspect=5858', '--remote-debugging-port=9227']);
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/main'),
            rollupOptions: {
              external: [
                'electron',
                'socket.io-client',
                '@azure/storage-file-share',
                'uuid',
                'getmac',
                'roslib',
                'big-integer',
                'nano-time',
                ...builtinModules
              ]
            }
          },
          plugins: [
            EnvironmentPlugin('all', { prefix: '' }),
            TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })
          ]
        }
      },
      {
        entry: './src/worker/workerRosBridgeServerHealthcheck.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page
          // when the Preload-Scripts build is complete,
          // instead of restarting the entire Electron App.
          options.reload();
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/worker')
          },
          plugins: [
            EnvironmentPlugin('all', { prefix: '' }),
            TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })
          ]
        }
      },
      {
        entry: './src/worker/workerCommandsStatusHealthcheck.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page
          // when the Preload-Scripts build is complete,
          // instead of restarting the entire Electron App.
          options.reload();
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/worker')
          },
          plugins: [
            EnvironmentPlugin('all', { prefix: '' }),
            TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })
          ]
        }
      },
      {
        entry: './src/worker/workerRosBridgeTopicSubscriber.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page
          // when the Preload-Scripts build is complete,
          // instead of restarting the entire Electron App.
          options.reload();
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/worker'),
            rollupOptions: {
              external: ['roslib', 'big-integer', 'nano-time', ...builtinModules]
            }
          },
          plugins: [
            EnvironmentPlugin('all', { prefix: '' }),
            TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })
          ]
        }
      },
      {
        entry: './src/worker/workerSubSystemHealthCheck.ts',
        onstart(options) {
          // Notify the Renderer-Process to reload the page
          // when the Preload-Scripts build is complete,
          // instead of restarting the entire Electron App.
          options.reload();
        },
        vite: {
          build: {
            assetsDir: '',
            sourcemap: isDebug,
            outDir: resolve('./app/dist/worker'),
            rollupOptions: {
              external: [...builtinModules]
            }
          },
          plugins: [
            EnvironmentPlugin('all', { prefix: '' }),
            TsConfigPaths({ projects: [resolve(__dirname, '../tsconfig.json')] })
          ]
        }
      }
    ])
  ]
});
