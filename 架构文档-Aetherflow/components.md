# AetherFlow Component Documentation

## Table of Contents

1. [Common Components](#common-components)
   - [Button](#button)
   - [Card](#card)
   - [HoverEffect](#hover-effect)
   - [Input](#input)
   - [LoadingIndicator](#loading-indicator)
   - [MagicParticles](#magic-particles)
   - [Modal](#modal)
   - [Shimmer](#shimmer)
   - [Toast](#toast)

2. [SidePanel Components](#sidepanel-components)
   - [App](#app)
   - [Header](#header)
   - [Navigation](#navigation)
   - [OptimizeSection](#optimize-section)
   - [PromptLibrary](#prompt-library)
   - [PromptShortcut](#prompt-shortcut)
   - [AuthModal](#auth-modal)
   - [SettingsModal](#settings-modal)

3. [Hooks](#hooks)
   - [usePrompts](#use-prompts)

## Common Components

### Button
**Description**: A versatile button component with multiple variants and states.

**Props**:
- `variant`: 'primary' | 'secondary' (default: 'primary')
- `loading`: boolean (default: false)
- `icon`: React.ReactNode
- `fullWidth`: boolean (default: false)
- All standard button HTML attributes

**Usage Example**:
```tsx
<Button 
  variant="primary"
  loading={isLoading}
  icon={<Save size={16} />}
  onClick={handleSave}
>
  Save Changes
</Button>
```

### Card
**Description**: A container component with hover effects and optional actions.

**Props**:
- `title`: string (optional)
- `children`: React.ReactNode
- `actions`: React.ReactNode (optional)
- `className`: string (optional)
- `onClick`: () => void (optional)

**Usage Example**:
```tsx
<Card
  title="Featured Content"
  actions={<Button>View More</Button>}
>
  <p>Card content goes here</p>
</Card>
```

### HoverEffect
**Description**: A wrapper component that adds hover animation effects to its children.

**Props**:
- `children`: React.ReactNode
- `className`: string (optional)

**Usage Example**:
```tsx
<HoverEffect>
  <div>Content with hover effect</div>
</HoverEffect>
```

### Input
**Description**: An enhanced input component with icon support and error handling.

**Props**:
- `icon`: React.ReactNode (optional)
- `error`: string (optional)
- All standard input HTML attributes

**Usage Example**:
```tsx
<Input
  icon={<Search size={16} />}
  placeholder="Search..."
  error={validationError}
  onChange={handleSearch}
/>
```

### LoadingIndicator
**Description**: A spinning loader component with customizable size.

**Props**:
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `className`: string (optional)

**Usage Example**:
```tsx
<LoadingIndicator size="sm" />
```

### MagicParticles
**Description**: A decorative component that creates animated particle effects.

**Props**: None

**Usage Example**:
```tsx
<div className="relative">
  <MagicParticles />
  <div>Content with particle effects</div>
</div>
```

### Modal
**Description**: A modal dialog component with backdrop and animations.

**Props**:
- `isOpen`: boolean
- `onClose`: () => void
- `title`: string
- `children`: React.ReactNode
- `className`: string (optional)

**Usage Example**:
```tsx
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Settings"
>
  <div>Modal content</div>
</Modal>
```

### Shimmer
**Description**: A loading shimmer effect component.

**Props**:
- `className`: string (optional)

**Usage Example**:
```tsx
<div className="relative">
  <Shimmer />
  <div>Content with shimmer effect</div>
</div>
```

### Toast
**Description**: A notification toast component with success/error states.

**Props**:
- `message`: string
- `type`: 'success' | 'error'
- `duration`: number (default: 3000)
- `onClose`: () => void

**Usage Example**:
```tsx
<Toast
  message="Changes saved successfully"
  type="success"
  duration={5000}
  onClose={() => setShowToast(false)}
/>
```

## SidePanel Components

### App
**Description**: The root component of the side panel interface.

**State Management**:
- Active tab ('library' | 'optimize')
- Optimization input and versions
- Modal states
- Authentication state
- Magician level

**Key Features**:
- Tab navigation between prompt library and optimization
- Prompt optimization workflow
- Modal management
- User authentication

### PromptShortcut
**Description**: A quick access component for searching and selecting prompts.

**Props**:
- `onSelect`: (prompt: Prompt) => void

**Features**:
- Keyboard shortcut (/) for activation
- Real-time prompt search
- Favorite prompts highlighting
- Usage tracking

**Usage Example**:
```tsx
<PromptShortcut onSelect={handlePromptSelect} />
```

## Hooks

### usePrompts
**Description**: A custom hook for managing prompts with storage and search functionality.

**Returns**:
- `prompts`: Prompt[]
- `loading`: boolean
- `searchPrompts`: (query: string) => Prompt[]
- `incrementPromptUse`: (promptId: string) => Promise<void>

**Usage Example**:
```tsx
const { prompts, loading, searchPrompts } = usePrompts();
```

## Best Practices

1. **State Management**
   - Use local state for UI-specific states
   - Use Chrome storage for persistent data
   - Implement proper loading and error states

2. **Performance**
   - Implement debouncing for search operations
   - Use React.memo() for frequently re-rendered components
   - Optimize re-renders with proper dependency arrays in hooks

3. **Error Handling**
   - Always handle async operation errors
   - Provide user feedback through Toast components
   - Implement proper fallbacks for loading states

4. **Accessibility**
   - Ensure proper ARIA attributes
   - Support keyboard navigation
   - Maintain sufficient color contrast

5. **Chrome Extension Best Practices**
   - Follow Chrome's Manifest V3 guidelines
   - Implement proper message passing between components
   - Handle permissions appropriately

## Version History

### Version 1.0.0
- Initial release
- Basic prompt management functionality
- Prompt optimization feature
- User authentication
- Settings management

### Version 1.0.1 (Planned)
- Enhanced prompt search
- Improved optimization algorithms
- Additional prompt templates
- Performance optimizations