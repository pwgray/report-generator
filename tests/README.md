# React Web Frontend Tests

This directory contains comprehensive unit tests for the React web frontend using **Vitest** and **React Testing Library**.

> 📘 **New to our test setup?** Check out [ORGANIZATION.md](./ORGANIZATION.md) for detailed guidelines on test structure and best practices.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## 📁 Test Organization

Tests are **co-located** with the code they test:

```
web/
├── __tests__/              # Root-level tests (App.tsx)
├── components/__tests__/   # Component tests
├── services/__tests__/     # Service tests
└── tests/                  # This directory (shared utilities)
    ├── setup.ts           # Global test configuration
    ├── utils.tsx          # Shared test helpers
    ├── README.md          # This file
    └── ORGANIZATION.md    # Detailed organization guide
```

**Why co-location?**
- Tests are easy to find
- Tests move with the code during refactoring
- Clear 1:1 relationship between source and tests

See [ORGANIZATION.md](./ORGANIZATION.md) for complete details.

## Test Framework

- **Vitest**: Fast, modern testing framework for Vite projects
- **React Testing Library**: Testing utilities that encourage good testing practices
- **@testing-library/user-event**: User interaction simulation
- **@testing-library/jest-dom**: Custom matchers for DOM assertions
- **jsdom**: DOM environment for Node.js testing

## Test Coverage

### UI Components (`components/__tests__/UIComponents.test.tsx`)
✅ **37 tests** - Complete coverage of all UI components:

- **Button**: Variants, loading states, disabled states, click handlers
- **Input**: Labels, values, placeholders, change handlers
- **Select**: Options, selections, change handlers
- **Card**, **CardHeader**, **CardContent**: Rendering and styling
- **Badge**: Color variants

### DataSource Service (`services/__tests__/datasourceService.test.ts`)
✅ **14 tests** - Complete coverage of datasource API interactions:

- `testConnectionAndFetchSchema`: Success and error cases
- `fetchTableData`: With datasource ID, object, filters, and sorts
- `listDatasources`: Success and error cases
- `createDatasource`: Success and validation errors
- `updateDatasource`: Success and not found errors
- `deleteDatasource`: Success and error cases

### Report Service (`services/__tests__/reportService.test.ts`)
✅ **10 tests** - Complete coverage of report API interactions:

- `listReports`: Success and error cases
- `getReport`: Success and not found errors
- `createReport`: Success and validation errors
- `updateReport`: Success and not found errors
- `deleteReport`: Success and error cases

### DataSourceView Component (`components/__tests__/DataSourceView.test.tsx`)
✅ **10 tests** - Component behavior and user interactions:

- List view rendering with data sources
- Empty state display
- Read-only mode
- Create new datasource workflow
- Edit existing datasource
- Delete with confirmation
- Cancel operations

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../tests/utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<MyComponent onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Mocking API Calls

```typescript
// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// In your test
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ data: 'value' })
});
```

### Mocking Modules

```typescript
vi.mock('../../services/myService', () => ({
  myFunction: vi.fn().mockResolvedValue({ result: 'success' })
}));
```

## Best Practices

1. **Test Behavior, Not Implementation**: Focus on what the user sees and does
2. **Use Semantic Queries**: Prefer `getByRole`, `getByLabelText` over `getByTestId`
3. **User-Centric Testing**: Use `userEvent` for realistic user interactions
4. **Async Operations**: Always use `await` with `userEvent` and async operations
5. **Cleanup**: Tests automatically cleanup after each test via `afterEach` in `setup.ts`
6. **Mock External Dependencies**: Mock API calls, external services, and complex modules

## Common Testing Patterns

### Testing Forms

```typescript
it('submits form with user input', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();
  
  render(<MyForm onSubmit={handleSubmit} />);
  
  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: /submit/i }));
  
  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'John Doe' })
  );
});
```

### Testing Conditional Rendering

```typescript
it('shows error message when error prop is provided', () => {
  render(<MyComponent error="Something went wrong" />);
  expect(screen.getByText('Something went wrong')).toBeInTheDocument();
});

it('does not show error message when no error', () => {
  render(<MyComponent />);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
```

### Testing Async Data Loading

```typescript
it('displays loading state then data', async () => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => [{ id: 1, name: 'Item' }]
  });
  
  render(<MyComponent />);
  
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Item')).toBeInTheDocument();
  });
});
```

## Test Configuration

### `vite.config.ts`
```typescript
test: {
  globals: true,
  environment: 'jsdom',
  setupFiles: './tests/setup.ts',
  css: true,
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html']
  }
}
```

### `tests/setup.ts`
- Imports `@testing-library/jest-dom` for enhanced matchers
- Cleans up after each test
- Mocks `window.matchMedia`
- Mocks `global.fetch`
- Mocks `crypto.randomUUID`

## Troubleshooting

### Tests Not Running
- Ensure dependencies are installed: `npm install`
- Check that test files match the pattern: `**/__tests__/**/*.test.{ts,tsx}`

### Import Errors
- Verify import paths are correct
- Check that mocked modules match actual module exports

### Async Test Failures
- Use `await` with all `userEvent` methods
- Use `waitFor` for async state updates
- Increase timeout if needed: `{ timeout: 5000 }`

### TypeScript Errors
- Ensure `@types/*` packages are installed
- Check `tsconfig.json` includes test files
- Add type assertions where needed: `as any`, `expect.any()`

## Next Steps

For adding tests to complex components like `ReportBuilder` and `ReportViewer`:

1. Break down into smaller, testable units
2. Mock child components if needed
3. Focus on critical user paths
4. Use integration tests for complete workflows

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event API](https://testing-library.com/docs/user-event/intro)

