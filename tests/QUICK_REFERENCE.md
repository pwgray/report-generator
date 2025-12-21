# Test Structure - Quick Reference

## 📊 Current Test Organization

```
web/
│
├── __tests__/                              # 🎯 Root-level integration tests
│   └── App.test.tsx (34 tests)            # Main app integration tests
│
├── components/                             # 🧩 React components
│   ├── __tests__/                         # Component tests (co-located)
│   │   ├── UIComponents.test.tsx (37)    # UI primitives
│   │   └── DataSourceView.test.tsx (10)  # DataSource management UI
│   ├── UIComponents.tsx                   # Button, Input, Card, etc.
│   ├── DataSourceView.tsx                 # DataSource CRUD interface
│   ├── ReportBuilder.tsx                  # Report creation wizard
│   └── ReportViewer.tsx                   # Report display & execution
│
├── services/                               # 🔧 Business logic & API
│   ├── __tests__/                         # Service tests (co-located)
│   │   ├── datasourceService.test.ts (14) # DataSource API tests
│   │   └── reportService.test.ts (10)     # Report API tests
│   ├── datasourceService.ts               # DataSource API client
│   ├── reportService.ts                   # Report API client
│   └── geminiService.ts                   # AI integration
│
├── tests/                                  # 🛠️ Shared test infrastructure
│   ├── setup.ts                           # Global config & mocks
│   ├── utils.tsx                          # Custom render helpers
│   ├── README.md                          # This guide
│   └── ORGANIZATION.md                    # Detailed patterns
│
└── types.ts                                # TypeScript definitions
```

## 📈 Test Coverage Summary

```
Total: 106 tests (104 passing, 2 skipped)

By Category:
├── Components: 47 tests
│   ├── UIComponents: 37 ✓
│   └── DataSourceView: 10 ✓
│
├── Services: 24 tests
│   ├── datasourceService: 14 ✓
│   └── reportService: 10 ✓
│
└── Integration: 34 tests (32 passing, 2 skipped)
    └── App: 34 (Navigation, CRUD, Permissions)
```

## 🎯 Where to Add Tests

### For a New Component
```bash
# 1. Create the component
web/components/NewFeature.tsx

# 2. Create test file in same directory
web/components/__tests__/NewFeature.test.tsx

# 3. Import utilities
import { render, screen } from '../../tests/utils';
```

### For a New Service
```bash
# 1. Create the service
web/services/newService.ts

# 2. Create test file in same directory
web/services/__tests__/newService.test.ts

# 3. Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;
```

### For Integration Tests
```bash
# Place in root __tests__/
web/__tests__/MyFeature.test.tsx
```

## 🏃 Common Commands

```bash
# Development workflow
npm run test:watch              # Auto-rerun on changes

# Before committing
npm test                        # Run all tests once

# Debugging
npm test -- NewComponent        # Run specific test file
npm test -- --grep "should"     # Run tests matching pattern
npm run test:ui                 # Visual test runner

# Quality checks
npm run test:coverage           # Generate coverage report
```

## 📝 Quick Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../tests/utils';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    
    render(<MyComponent onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(onClick).toHaveBeenCalled();
  });
});
```

## 🎨 Common Patterns

### Mock a Service
```typescript
vi.mock('../../services/myService', () => ({
  myFunction: vi.fn().mockResolvedValue({ data: 'mock' })
}));
```

### Wait for Async
```typescript
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### User Interactions
```typescript
const user = userEvent.setup();
await user.type(screen.getByRole('textbox'), 'input text');
await user.click(screen.getByRole('button'));
await user.selectOptions(screen.getByRole('combobox'), 'option');
```

### Query Priorities
```typescript
// 1. Accessible to everyone (preferred)
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email')

// 2. Semantic queries
screen.getByText('Welcome')
screen.getByPlaceholderText('Enter email')

// 3. Test IDs (last resort)
screen.getByTestId('custom-element')
```

## 🚨 Common Pitfalls

❌ **Don't**
```typescript
// Accessing implementation details
wrapper.find('.className')

// Not waiting for async
user.click(button); // Missing await
expect(mockFn).toHaveBeenCalled(); // Called before click completes

// Testing implementation instead of behavior
expect(component.state.value).toBe('test')
```

✅ **Do**
```typescript
// Test user-visible behavior
screen.getByRole('button', { name: /submit/i })

// Wait for async operations
await user.click(button);
await waitFor(() => expect(mockFn).toHaveBeenCalled());

// Test observable behavior
expect(screen.getByText('Success!')).toBeInTheDocument()
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `tests/setup.ts` | Global mocks & configuration |
| `tests/utils.tsx` | Custom render & helpers |
| `tests/ORGANIZATION.md` | Detailed guidelines |
| `vite.config.ts` | Vitest configuration |

## 🔗 Next Steps

1. **New to testing?** → Read [`tests/README.md`](./README.md)
2. **Adding tests?** → Follow [`tests/ORGANIZATION.md`](./ORGANIZATION.md)
3. **Need examples?** → Check existing `__tests__/` directories
4. **Debugging?** → Use `npm run test:ui` for visual debugging

---

**Last Updated**: December 2025  
**Test Framework**: Vitest 4.0.16  
**Total Tests**: 106 (104 passing)

