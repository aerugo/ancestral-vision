/**
 * Development Shortcuts
 *
 * Keyboard shortcuts for development and testing.
 * Only active in template mode (development environment).
 *
 * SECURITY: Never active in production.
 */

import { isTemplateMode } from './template-mode';

/**
 * Shortcut handler function type
 */
type ShortcutHandler = () => void;

/**
 * Registered shortcut
 */
interface RegisteredShortcut {
  key: string;
  description: string;
  handler: ShortcutHandler;
  /** Requires Ctrl/Cmd modifier */
  ctrl?: boolean;
  /** Requires Shift modifier */
  shift?: boolean;
}

/**
 * Development shortcuts registry
 */
class DevShortcuts {
  private _shortcuts: Map<string, RegisteredShortcut> = new Map();
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _enabled = false;

  /**
   * Initialize the shortcuts system
   * Only activates if in template mode
   */
  public init(): void {
    // Security: Only enable in template mode
    if (!isTemplateMode()) {
      console.log('[DevShortcuts] Not in template mode, shortcuts disabled');
      return;
    }

    if (this._enabled) {
      console.log('[DevShortcuts] Already initialized');
      return;
    }

    this._keydownHandler = this._handleKeydown.bind(this);
    window.addEventListener('keydown', this._keydownHandler);
    this._enabled = true;

    console.log('[DevShortcuts] Initialized. Press ? to see available shortcuts.');
  }

  /**
   * Cleanup the shortcuts system
   */
  public cleanup(): void {
    if (this._keydownHandler) {
      window.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    this._enabled = false;
  }

  /**
   * Register a shortcut
   */
  public register(shortcut: RegisteredShortcut): void {
    const key = this._normalizeKey(shortcut);
    this._shortcuts.set(key, shortcut);
  }

  /**
   * Unregister a shortcut
   */
  public unregister(key: string, ctrl = false, shift = false): void {
    const normalizedKey = this._normalizeKey({ key, ctrl, shift } as RegisteredShortcut);
    this._shortcuts.delete(normalizedKey);
  }

  /**
   * Get all registered shortcuts
   */
  public getAll(): RegisteredShortcut[] {
    return Array.from(this._shortcuts.values());
  }

  /**
   * Check if shortcuts are enabled
   */
  public isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Normalize key for lookup (combines modifiers)
   */
  private _normalizeKey(shortcut: { key: string; ctrl?: boolean; shift?: boolean }): string {
    const parts: string[] = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }

  /**
   * Handle keydown events
   */
  private _handleKeydown(e: KeyboardEvent): void {
    // Skip if focus is in an input field
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    // Build the key string
    const key = this._normalizeKey({
      key: e.key,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
    });

    const shortcut = this._shortcuts.get(key);
    if (shortcut) {
      e.preventDefault();
      shortcut.handler();
    }

    // Special case: ? to show help
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      this._showHelp();
    }
  }

  /**
   * Show help for available shortcuts
   */
  private _showHelp(): void {
    const shortcuts = this.getAll();
    if (shortcuts.length === 0) {
      console.log('[DevShortcuts] No shortcuts registered');
      return;
    }

    console.log('\n[DevShortcuts] Available shortcuts:');
    console.log('─'.repeat(50));
    for (const shortcut of shortcuts) {
      const modifiers: string[] = [];
      if (shortcut.ctrl) modifiers.push('Ctrl');
      if (shortcut.shift) modifiers.push('Shift');
      modifiers.push(shortcut.key.toUpperCase());
      const keyCombo = modifiers.join('+');
      console.log(`  ${keyCombo.padEnd(15)} ${shortcut.description}`);
    }
    console.log('─'.repeat(50));
  }
}

/**
 * Singleton instance
 */
export const devShortcuts = new DevShortcuts();

/**
 * Shortcut key constants
 */
export const DEV_SHORTCUT_KEYS = {
  /** Toggle biography on selected node */
  TOGGLE_BIOGRAPHY: 'b',
} as const;
