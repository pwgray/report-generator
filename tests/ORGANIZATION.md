# Test Organization & Best Practices

## 📁 Directory Structure

We follow the **co-location pattern** - tests live alongside the code they test:

```
web/
├── __tests__/                    # Root-level integration tests
│   └── App.test.tsx              # Main App component tests
│
├── components/                   # React components
│   ├── __tests__/                # Component tests (co-located)
│   │   ├── UIComponents.test.tsx
│   │   └── DataSourceView.test.tsx
│   ├── UIComponents.tsx
│   ├── DataSourceView.tsx
│   ├── ReportBuilder.tsx
│   └── ReportViewer.tsx
│
├── services/                     # Service layer
│   ├── __tests__/                # Service tests (co-located)
│   │   ├── datasourceService.test.ts
│   │   └── reportService.test.ts
│   ├── datasourceService.ts
│   ├── reportService.ts
│   └── geminiService.ts
│
├── tests/                        # Shared test utilities
│   ├── setup.ts                  # Global test configuration
│   ├── utils.tsx                 # Shared test helpers
│   └── README.md                 # Testing guide
│
└── types.ts                      # TypeScript types
```

## 🎯 Why This Structure?

### 1. **Co-location Benefits**
- ✅ Easy to find tests for any given file
- ✅ Tests move with the code during refactoring
- ✅ Clear 1:1 relationship between source and test
- ✅ Reduces context switching

### 2. **Separation of Concerns**
- **`__tests__/`**: Test files for the current directory
- **`tests/`**: Shared utilities, setup, and helpers
- **Root `__tests__/`**: Integration tests for top-level components

### 3. **Industry Standard**
This follows the patterns used by:
- Create React App
- Next.js
- Remix
- Most modern React projects

## 📝 Naming Conventions

### Test Files
```
SourceFile.tsx          → __tests__/SourceFile.test.tsx
SourceFile.ts           → __tests__/SourceFile.test.ts
```

### Test Suites
```typescript
describe('ComponentName', () => {
  describe('Feature/Behavior', () => {
    it('should do something specific', () => {
      // Test implementation
    });
  });
});
```

### Mock Files (if needed)
```
Component.tsx           → __mocks__/Component.tsx
service.ts              → __mocks__/service.ts
```

## 🔧 Test File Structure

### Component Test Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../tests/utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

// Mock external dependencies
vi.mock('../../services/myService');

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
  });

  describe('Rendering', () => {
    it('renders correctly with required props', () => {
      render(<MyComponent />);
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      
      render(<MyComponent onClick={handleClick} />);
      await user.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error States', () => {
    it('displays error message when error prop is provided', () => {
      render(<MyComponent error="Something went wrong" />);
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
```

### Service Test Template
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { myService } from '../myService';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('myService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('myFunction', () => {
    it('makes correct API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'value' })
      });

      const result = await myService.myFunction('param');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/endpoint'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result).toEqual({ data: 'value' });
    });

    it('handles errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(myService.myFunction('param')).rejects.toThrow();
    });
  });
});
```

## 🚀 Creating New Tests

### Step 1: Create Test File
Place the test file in `__tests__/` directory adjacent to the source:

```bash
# For a component
web/components/NewComponent.tsx
web/components/__tests__/NewComponent.test.tsx

# For a service
web/services/newService.ts
web/services/__tests__/newService.test.ts
```

### Step 2: Import Test Utilities
```typescript
// For component tests
import { render, screen, waitFor } from '../../tests/utils';
import userEvent from '@testing-library/user-event';

// For all tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

### Step 3: Write Tests
Follow the **Arrange-Act-Assert** pattern:

```typescript
it('updates state when button is clicked', async () => {
  // Arrange
  const user = userEvent.setup();
  const onUpdate = vi.fn();
  render(<MyComponent onUpdate={onUpdate} />);

  // Act
  await user.click(screen.getByRole('button', { name: /update/i }));

  // Assert
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({
    updated: true
  }));
});
```

## 📊 Running Tests

```bash
# Run all tests
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# UI mode (visual test runner)
npm run test:ui

# Coverage report
npm run test:coverage
```

## 🔍 Test Discovery

Vitest automatically discovers test files matching:
- `**/__tests__/**/*.test.{ts,tsx}`
- `**/__tests__/**/*.spec.{ts,tsx}`

Configuration in `vite.config.ts`:
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './tests/setup.ts',
  // Tests are auto-discovered in __tests__ directories
}
```

## 🎨 Shared Utilities

### `tests/setup.ts`
Global configuration that runs before all tests:
- Imports `@testing-library/jest-dom`
- Mocks `window.matchMedia`
- Mocks `global.fetch`
- Mocks `crypto.randomUUID`
- Cleans up after each test

### `tests/utils.tsx`
Shared test helpers:
- Custom `render` function
- Common test utilities
- Reusable test fixtures

### Usage
```typescript
import { render, screen } from '../../tests/utils';
```

## 📋 Checklist for New Tests

When adding tests for a new feature:

- [ ] Create `__tests__/` directory if it doesn't exist
- [ ] Name test file: `FeatureName.test.tsx` or `.test.ts`
- [ ] Import from `../../tests/utils` (adjust path as needed)
- [ ] Group tests with `describe` blocks
- [ ] Use descriptive test names with `it('should...')`
- [ ] Mock external dependencies
- [ ] Test happy path first
- [ ] Add edge cases and error scenarios
- [ ] Verify with `npm test`
- [ ] Check coverage with `npm run test:coverage`

## 🐛 Debugging Tests

### View Test Output
```bash
# Run specific test file
npm test -- App.test.tsx

# Run tests matching pattern
npm test -- --grep "Dashboard"

# Run with verbose output
npm test -- --reporter=verbose
```

### Common Issues

**Issue**: Test can't find element
```typescript
// ❌ Bad: Element not rendered yet
expect(screen.getByText('Loading...')).toBeInTheDocument();

// ✅ Good: Wait for element
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

**Issue**: Multiple elements found
```typescript
// ❌ Bad: Ambiguous query
screen.getByText('Submit');

// ✅ Good: Specific query
screen.getByRole('button', { name: /submit form/i });
```

**Issue**: Async operation not completing
```typescript
// ❌ Bad: Not awaiting user interaction
user.click(button);

// ✅ Good: Await async operations
await user.click(button);
await waitFor(() => expect(mockFn).toHaveBeenCalled());
```

## 📈 Coverage Goals

Target coverage for each category:

| Category | Target | Current |
|----------|--------|---------|
| Components | 80%+ | ✓ |
| Services | 90%+ | ✓ |
| Utils | 85%+ | - |
| Overall | 80%+ | ✓ |

View detailed coverage:
```bash
npm run test:coverage
# Open coverage/index.html in browser
```

## 🔄 Maintenance

### Updating Tests
When modifying code:
1. Run tests: `npm run test:watch`
2. Update affected tests
3. Ensure all tests pass
4. Update snapshots if needed (not used currently)

### Refactoring Tests
When tests become hard to maintain:
- Extract common setup to `beforeEach`
- Create helper functions in test file
- Move reusable helpers to `tests/utils.tsx`
- Consider test data factories for complex objects

### Example: Test Data Factory
```typescript
// tests/factories.ts
export function createMockReport(overrides = {}) {
  return {
    id: 'test-id',
    name: 'Test Report',
    dataSourceId: 'ds-1',
    selectedColumns: [],
    visualization: 'table',
    filters: [],
    sorts: [],
    ...overrides
  };
}

// Usage in tests
const report = createMockReport({ name: 'Custom Name' });
```

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [User Event Guide](https://testing-library.com/docs/user-event/intro)

## 🤝 Contributing

When adding new tests:
1. Follow the established patterns
2. Co-locate tests with source code
3. Use shared utilities from `tests/`
4. Add descriptive test names
5. Include both happy path and edge cases
6. Run full test suite before committing
7. Update this guide if patterns change

