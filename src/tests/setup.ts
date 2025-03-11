import '@testing-library/jest-dom'
import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import matchers from '@testing-library/jest-dom/matchers'

// Étend les assertions de Vitest avec celles de testing-library
expect.extend(matchers)

// Nettoie après chaque test
afterEach(() => {
  cleanup()
}) 