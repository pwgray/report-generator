# Feature Testing Guide

## 📋 Overview

Feature tests verify complete user workflows from start to finish. Unlike unit tests that test individual components, feature tests ensure that multiple parts of the application work together correctly to deliver full features.

## 🎯 What Are Feature Tests?

**Feature tests** (also called integration or E2E tests) test:
- Complete user workflows
- Multi-component interactions
- Data flow through the entire application
- Business scenarios end-to-end
- User permissions and security
- Navigation flows

## 📁 Location

```
web/__tests__/
├── App.test.tsx           # Component integration tests
└── features.test.tsx      # ⭐ Feature/workflow tests
```

## 🔬 Feature Tests vs Unit Tests

| Aspect | Unit Tests | Feature Tests |
|--------|------------|---------------|
| **Scope** | Single component/function | Complete workflow |
| **Focus** | Implementation details | User behavior |
| **Speed** | Very fast (ms) | Slower (seconds) |
| **Isolation** | Highly isolated | Integrated |
| **Mocking** | Mock everything external | Mock only boundaries (APIs) |
| **Coverage** | Code coverage | Feature coverage |

## 📊 Current Feature Coverage

### ✅ Implemented Features (95 tests total)

#### 1. **DataSource Workflow** (2 feature tests)
- ✓ Admin can create and manage datasources
- ✓ Non-admin users have read-only access

#### 2. **Report Creation Workflow** (2 feature tests)
- ✓ Complete flow from datasource to report viewing
- ✓ Report configuration persists (filters, sorts)

#### 3. **Report Sharing & Permissions** (2 feature tests)
- ✓ Private reports visible only to owner
- ✓ Only owner and admin can edit reports

#### 4. **Dashboard & Navigation** (3 feature tests)
- ✓ Dashboard displays accurate statistics
- ✓ Seamless navigation between sections
- ✓ State maintained during navigation

#### 5. **Report Filtering** (1 feature test)
- ✓ Filter by "All Shared Reports" vs "My Reports"

## 🎨 Feature Test Structure

### Template
```typescript
describe('Feature: [Feature Name]', () => {
  beforeEach(() => {
    // Setup: Mock API responses
    vi.mocked(service.method).mockResolvedValue(data);
  });

  it('[completes user workflow description]', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<App />);

    // Act: Simulate user workflow
    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Action 1'));
    await user.type(screen.getByLabelText('Field'), 'value');
    await user.click(screen.getByText('Action 2'));

    // Assert: Verify end state
    await waitFor(() => {
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });
  });
});
```

## 📝 Writing Feature Tests

### Step 1: Identify the Feature
Define the complete user workflow:
```
Feature: User creates and runs a report
1. Navigate to Reports
2. Click "Create Report"
3. Select datasource
4. Configure filters and columns
5. Save report
6. Run report
7. View results
```

### Step 2: Write the Test
```typescript
describe('Feature: Report Creation and Execution', () => {
  beforeEach(() => {
    // Mock all API calls
    vi.mocked(datasourceService.listDatasources).mockResolvedValue([mockDS]);
    vi.mocked(reportService.createReport).mockImplementation(async (r) => r);
  });

  it('allows user to create and run a report', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Step 1: Navigate to Reports
    await user.click(screen.getByText('Reports'));
    
    // Step 2: Create Report
    await user.click(screen.getByText('Create Report'));
    
    // Step 3-4: Configure (mocked component handles this)
    
    // Step 5: Save
    await user.click(screen.getByText('Save Report'));
    
    await waitFor(() => {
      expect(reportService.createReport).toHaveBeenCalled();
    });
    
    // Step 6: Run
    await user.click(screen.getByText('Run'));
    
    // Step 7: Verify results view
    await waitFor(() => {
      expect(screen.getByTestId('report-viewer')).toBeInTheDocument();
    });
  });
});
```

### Step 3: Mock Strategically
For feature tests, mock at the boundaries:
```typescript
// ✅ Good: Mock API services
vi.mock('../services/datasourceService');
vi.mock('../services/reportService');

// ✅ Good: Mock complex sub-components if needed
vi.mock('../components/ReportBuilder', () => ({
  ReportBuilder: ({ onSave }: any) => (
    <div><button onClick={() => onSave(mockReport)}>Save</button></div>
  )
}));

// ❌ Bad: Don't mock simple components
// Let real components render for better integration testing
```

## 🎯 Best Practices

### 1. Test User Workflows, Not Implementation
```typescript
// ❌ Bad: Testing implementation
it('updates state correctly', () => {
  // ...checking internal state
});

// ✅ Good: Testing user behavior
it('allows user to create and share a report', async () => {
  // ...simulating real user actions
});
```

### 2. Use Realistic Scenarios
```typescript
// ❌ Bad: Artificial test data
const report = { id: 1, name: 'test' };

// ✅ Good: Realistic business scenario
const salesReport = {
  id: 'report-123',
  name: 'Q4 Sales Analysis',
  dataSourceId: 'sales-db',
  selectedColumns: [
    { tableId: 'orders', columnId: 'total_amount' },
    { tableId: 'orders', columnId: 'order_date' }
  ],
  filters: [
    { columnId: 'order_date', operator: 'greaterThan', value: '2024-01-01' }
  ],
  visualization: 'bar'
};
```

### 3. Test Happy Path First, Then Edge Cases
```typescript
describe('Feature: Report Sharing', () => {
  it('successfully shares report with team', async () => {
    // Happy path
  });

  it('prevents sharing when user lacks permission', async () => {
    // Error case
  });

  it('handles network failures gracefully', async () => {
    // Edge case
  });
});
```

### 4. Keep Tests Independent
```typescript
// ✅ Good: Each test is independent
beforeEach(() => {
  // Fresh mocks for each test
  vi.mocked(service.list).mockResolvedValue([]);
});

// ❌ Bad: Tests depend on each other
let sharedState = {};
it('creates item', () => { sharedState.id = '123'; });
it('deletes item', () => { delete(sharedState.id); }); // Depends on previous test
```

## 🔍 Common Patterns

### Pattern 1: Multi-Step Workflow
```typescript
it('completes checkout workflow', async () => {
  const user = userEvent.setup();
  render(<App />);

  // Step 1: Add to cart
  await user.click(screen.getByText('Add to Cart'));
  
  // Step 2: Go to cart
  await user.click(screen.getByText('Cart'));
  
  // Step 3: Proceed to checkout
  await user.click(screen.getByText('Checkout'));
  
  // Step 4: Fill shipping
  await user.type(screen.getByLabelText('Address'), '123 Main St');
  
  // Step 5: Complete order
  await user.click(screen.getByText('Place Order'));
  
  // Verify success
  await waitFor(() => {
    expect(screen.getByText('Order Confirmed')).toBeInTheDocument();
  });
});
```

### Pattern 2: Permission Testing
```typescript
it('restricts access based on user role', async () => {
  const user = userEvent.setup();
  render(<App />);

  // As non-admin user
  await user.selectOptions(screen.getByLabelText('User'), 'user');
  await user.click(screen.getByText('Settings'));
  
  // Should not see admin options
  expect(screen.queryByText('Manage Users')).not.toBeInTheDocument();
  
  // Switch to admin
  await user.selectOptions(screen.getByLabelText('User'), 'admin');
  
  // Should see admin options
  expect(screen.getByText('Manage Users')).toBeInTheDocument();
});
```

### Pattern 3: Data Persistence
```typescript
it('persists data across navigation', async () => {
  const user = userEvent.setup();
  render(<App />);

  // Create item
  await user.click(screen.getByText('New Item'));
  await user.type(screen.getByLabelText('Name'), 'Test Item');
  await user.click(screen.getByText('Save'));
  
  // Navigate away
  await user.click(screen.getByText('Dashboard'));
  
  // Navigate back
  await user.click(screen.getByText('Items'));
  
  // Should still be there
  expect(screen.getByText('Test Item')).toBeInTheDocument();
});
```

## 🚀 Running Feature Tests

```bash
# Run all tests (includes features)
npm test

# Run only feature tests
npm test -- features.test.tsx

# Watch mode for features
npm test -- features.test.tsx --watch

# Visual UI
npm run test:ui
```

## 📈 Coverage Goals

| Feature | Target | Current |
|---------|--------|---------|
| DataSource Management | 100% | ✅ 100% |
| Report Creation | 100% | ✅ 100% |
| Report Sharing | 100% | ✅ 100% |
| Dashboard | 100% | ✅ 100% |
| Navigation | 100% | ✅ 100% |
| Filtering | 100% | ✅ 100% |

## 🐛 Debugging Feature Tests

### Issue: Test times out
```typescript
// ❌ Bad: No timeout specified
await waitFor(() => {
  expect(screen.getByText('...')).toBeInTheDocument();
});

// ✅ Good: Explicit timeout
await waitFor(() => {
  expect(screen.getByText('...')).toBeInTheDocument();
}, { timeout: 5000 });
```

### Issue: Element not found
```typescript
// Debug: Print what's in the document
screen.debug();

// Or print specific element
screen.debug(screen.getByTestId('my-element'));

// Or check what queries are available
screen.getByRole('button', { name: /partial text/i });
```

### Issue: Async operations not completing
```typescript
// ✅ Always await user interactions
await user.click(button);
await user.type(input, 'text');

// ✅ Wait for effects to complete
await waitFor(() => {
  expect(mockFn).toHaveBeenCalled();
});
```

## 🔄 Maintenance

### When to Update Feature Tests
- ✅ When user workflows change
- ✅ When new features are added
- ✅ When permissions model changes
- ✅ When navigation structure changes
- ❌ Not for every small UI change

### Refactoring Tips
```typescript
// Extract common workflows
async function loginAsAdmin(user: UserEvent) {
  await user.selectOptions(screen.getByLabelText('User'), 'admin');
  await waitFor(() => {
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
}

// Use in tests
it('admin can manage users', async () => {
  const user = userEvent.setup();
  render(<App />);
  
  await loginAsAdmin(user);
  
  // Continue with test...
});
```

## 🎓 Learning Resources

- [Testing Library User Guide](https://testing-library.com/docs/user-event/intro)
- [Kent C. Dodds - Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

## 📝 Checklist for New Feature Tests

When adding a new feature test:

- [ ] Identify complete user workflow
- [ ] Start from user's perspective
- [ ] Mock only at boundaries (APIs, complex components)
- [ ] Test happy path first
- [ ] Add error scenarios
- [ ] Verify permissions/access control
- [ ] Test data persistence
- [ ] Check navigation flows
- [ ] Use realistic data
- [ ] Add descriptive test names
- [ ] Document any complex setup

---

**Last Updated**: December 2025  
**Total Feature Tests**: 10  
**Coverage**: 100% of major workflows

