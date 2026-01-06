# Project: MoneyMap

## Project Overview

MoneyMap is a personal finance management application built with React Native and Expo. It allows users to track their finances, create budgets, and manage their accounts. The app uses Auth0 for authentication, Plaid for connecting to financial institutions, WatermelonDB for the local database, and TanStack Query for data fetching. The UI is styled with Tailwind CSS and supports both light and dark modes.

## Building and Running

### Prerequisites

- Node.js and npm
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

1.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App

-   **Start the development server:**
    ```bash
    npx expo start --dev-client --clear
    ```
-   **Run on iOS:**
    ```bash
    npm run ios
    ```
-   **Run on Android:**
    ```bash
    npm run android
    ```

### Building the App

-   **Build for iOS (Preview):**
    ```bash
    npm run build-ios-preview
    ```
-   **Build for iOS (Production):**
    ```bash
    npm run build-ios-production
    ```
-   **Build for Android (Preview):**
    ```bash
    npm run build-android-preview
    ```
-   **Build for Android (Production):**
    ```bash
    npm run build-android-production
    ```

## Development Conventions

### Code Style

The project uses Prettier for code formatting. To format the code, run:

```bash
npm run format
```

### Linting

The project uses ESLint for linting. To check for linting errors, run:

```bash
npm run lint
```

### API Generation

The project uses `swagger-typescript-api` to generate the API client from a Swagger/OpenAPI specification. To regenerate the API client, run:

```bash
npm run generate-api
```

### Database

The project uses WatermelonDB as a local database. The schema is defined in `model/schema.js`. Migrations are handled by WatermelonDB.

### Authentication

Authentication is handled by Auth0. The configuration is in `hooks/my-auth0.ts`.

### Data Synchronization

The application uses a `SyncOrchestrator` to manage data synchronization between the local database and the backend. The orchestrator handles foreground and background sync, debounced pushes of local changes, and periodic checks with Plaid to ensure data is up-to-date.

### Theming

The application uses Tailwind CSS for styling and has a theming system that supports light and dark modes. The theme is configured in `tailwind.config.js` and `constants/colors.ts`.
