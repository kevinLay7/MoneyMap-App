# MoneyMap Agent Guidelines

This file contains guidelines for agentic coding agents working on the MoneyMap React Native/Expo application.

## Build & Development Commands

### Core Commands

- `npm start` - Start Expo development server with dev client
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run on web browser
- `npm run device` - Run on physical iOS device

### Code Quality

- `npm run lint` - Run ESLint for code linting
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting without changes

### Build Commands

- `npm run build-ios-preview` - Build iOS preview version
- `npm run build-ios-production` - Build iOS production version
- `npm run build-android-preview` - Build Android preview version
- `npm run build-android-production` - Build Android production version

### API Generation

- `npm run generate-api` - Generate TypeScript API client from Swagger

### Testing

This project does not currently have a formal test suite configured. When implementing tests, check for Jest, Vitest, or React Native Testing Library configurations.

## Code Style Guidelines

### Import Organization

```typescript
// 1. React Native imports
import { Pressable, Alert } from 'react-native';

// 2. Third-party libraries
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

// 3. Local imports (use @/ path alias)
import IconCircle from '@/components/ui/icon-circle';
import { useMoneyFormatter } from '@/hooks/format-money';
import { BudgetItemState } from '@/model/models/budget-item';
import { Colors } from '@/constants/colors';
```

### TypeScript & Types

- Use strict TypeScript configuration
- Define interfaces for all component props
- Use readonly for immutable props
- Prefer explicit types over any
- Use enums for fixed sets of values

```typescript
interface BudgetItemRowProps {
  readonly item: BudgetItemState;
  readonly onPress?: (item: BudgetItemState) => void;
  readonly onDelete?: (itemId: string) => void;
}
```

### Component Structure

- Use functional components with hooks
- Export named functions, not default exports
- Keep components focused and single-purpose
- Use proper TypeScript prop interfaces

### Naming Conventions

- **Components**: PascalCase (e.g., `BudgetItemRow`)
- **Files**: kebab-case for components (e.g., `budget-item-row.tsx`)
- **Variables/Functions**: camelCase (e.g., `formatMoney`, `handleDelete`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `BudgetStatus.ACTIVE`)
- **Interfaces**: PascalCase with descriptive names (e.g., `BudgetItemRowProps`)

### Database Models (WatermelonDB)

- Use decorators for field definitions
- Follow the established pattern for computed observables
- Use proper associations and relations
- Include JSDoc comments for complex computed properties

```typescript
@field('balance') balance!: number;
@date('start_date') startDate!: Date;
@relation('accounts', 'account_id') account!: Query<Account>;
@children('budget_items') budgetItems!: Query<BudgetItem>;
```

### Services

- Use dependency injection pattern
- Create DTO interfaces for method parameters
- Handle errors appropriately with try-catch
- Use async/await consistently
- Return proper TypeScript types

### Error Handling

- Use try-catch blocks for async operations
- Provide meaningful error messages
- Use Alert for user-facing confirmations
- Log errors appropriately for debugging

### Styling (NativeWind/Tailwind)

- Use Tailwind CSS classes via NativeWind
- Follow the established color scheme from constants/colors.ts
- Use semantic class names (e.g., `bg-background-secondary`)
- Avoid inline styles when possible

### File Organization

```
components/
  feature-name/
    component-name.tsx
    index.ts
model/models/
  feature-model.ts
services/
  feature-service.ts
hooks/
  feature-hook.ts
types/
  feature-types.ts
```

### Path Aliases

- Use `@/` for absolute imports from project root
- Import from index files when available
- Avoid relative imports with many `../`

### Code Formatting

- Use Prettier with Tailwind plugin
- Configure to format on save
- Follow existing line length and indentation
- Use semicolons consistently

### React Native Specific

- Use Pressable instead of TouchableOpacity for better accessibility
- Properly handle safe areas
- Use platform-specific code when necessary
- Follow Expo best practices

### State Management

- Use WatermelonDB for data persistence
- Use RxJS observables for reactive state
- Prefer computed observables for derived state
- Use React hooks for component state

### Comments & Documentation

- Use JSDoc for complex functions and interfaces
- Comment business logic that isn't self-evident
- Avoid commenting obvious code
- Include parameter and return type documentation

## Development Workflow

1. Always run `npm run lint` and `npm run format:check` before committing
2. Test on both iOS and Android platforms when applicable
3. Follow the established component and service patterns
4. Use proper TypeScript types throughout
5. Handle database operations within write transactions
6. Use the existing color scheme and styling patterns

## Project Structure Notes

- This is an Expo React Native project with NativeWind for styling
- Uses WatermelonDB for local data storage
- Integrates with Plaid for financial data
- Uses RxJS for reactive programming patterns
- Follows a service-oriented architecture pattern
