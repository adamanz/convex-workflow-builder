/**
 * Generated API stubs - these will be replaced by `npx convex dev`
 */

// Stub API object that mimics the structure of generated Convex API
// This allows the app to compile before `npx convex dev` generates real types

type AnyFunction = (...args: unknown[]) => unknown

interface ApiStub {
  [key: string]: ApiStub | AnyFunction
}

function createApiProxy(path: string[] = []): ApiStub {
  return new Proxy({} as ApiStub, {
    get: (_, prop: string) => {
      if (prop === 'then') return undefined // Prevent Promise detection
      return createApiProxy([...path, prop])
    },
    apply: () => {
      // Return undefined for any function call
      return undefined
    }
  })
}

export const api = createApiProxy() as {
  workflows: {
    list: AnyFunction
    get: AnyFunction
    create: AnyFunction
    update: AnyFunction
    updateCanvas: AnyFunction
    updateNodeConfig: AnyFunction
    publish: AnyFunction
    archive: AnyFunction
    remove: AnyFunction
    duplicate: AnyFunction
  }
  executions: {
    listByWorkflow: AnyFunction
    get: AnyFunction
    listRecent: AnyFunction
    getLogs: AnyFunction
    start: AnyFunction
    updateStatus: AnyFunction
    updateCurrentStep: AnyFunction
    addStepResult: AnyFunction
    addLog: AnyFunction
    cancel: AnyFunction
    executeHttpAction: AnyFunction
  }
  templates: {
    list: AnyFunction
    seedDefaults: AnyFunction
  }
}

export const internal = createApiProxy()
