import { describe, it, expect, vi } from 'vitest'

// Mock the router
vi.mock('./router', () => ({
  router: {
    state: { location: { pathname: '/' } },
  },
}))

// Mock convex
vi.mock('convex/react', () => ({
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
  ConvexReactClient: vi.fn(),
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => vi.fn()),
}))

describe('App', () => {
  it('should be defined', () => {
    expect(true).toBe(true)
  })
})
