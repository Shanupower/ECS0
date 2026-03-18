# UI Components

Apple-inspired glassmorphism design system. All components use theme tokens from `src/theme/theme.css`.

## Components

- **Card** – Frosted glass card; props: `variant`, `hover`, `padding`, `className`
- **Button** – Primary / secondary / ghost; props: `variant`, `icon`, `className`
- **SegmentedControl** – Pill group; props: `options`, `value`, `onChange`
- **Chip** – Filter tag; props: `label`, `onClose`, `selected`
- **Badge** – Status or priority; props: `variant` ('status'|'priority'), `value`, `label`
- **Table** – Sortable table; props: `columns`, `sort`, `onSortChange`, `density`, `stickyHeader`, `zebra`
- **Input** – Themed text input; props: `label`, `error`, `className`
- **Select** – Themed native select; props: `label`, `className`
- **Switch** – Toggle; props: `checked`, `onChange`
- **Toast** – Use `ToastProvider` in App and `useToast()` for success/error/info
- **Skeleton** – Loading placeholder; props: `variant` (line|block|card), `lines`
- **EmptyState** – Empty state with actions; props: `icon`, `title`, `message`, `primaryAction`, `secondaryAction`
- **Drawer** – Slide-over panel; props: `open`, `onClose`, `title`, `side` ('left'|'right')

Import from `'../components/ui'` or `'../components/ui/ComponentName'`.
