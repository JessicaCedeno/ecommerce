/**
 * Tests for src/components/ui/Toast.tsx
 * Uses fake timers for auto-dismiss timing
 */

import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Toast from '@/components/ui/Toast';

const noop = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('Toast — rendering', () => {
  it('has role="alert"', () => {
    render(<Toast message="Hello" onDismiss={noop} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<Toast message="Hello" onDismiss={noop} />);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the message text', () => {
    render(<Toast message="Saved successfully" onDismiss={noop} />);
    expect(screen.getByText('Saved successfully')).toBeInTheDocument();
  });

  it('has a dismiss button with aria-label', () => {
    render(<Toast message="Msg" onDismiss={noop} />);
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
  });
});

describe('Toast — variants', () => {
  it('applies success styles by default', () => {
    render(<Toast message="OK" onDismiss={noop} />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-green-600');
  });

  it('applies error styles', () => {
    render(<Toast message="Fail" variant="error" onDismiss={noop} />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-600');
  });

  it('applies info styles', () => {
    render(<Toast message="Note" variant="info" onDismiss={noop} />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-indigo-600');
  });
});

describe('Toast — auto-dismiss', () => {
  it('calls onDismiss after default 4000ms', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Auto" onDismiss={onDismiss} />);

    // Trigger the auto-hide timer (4000ms) + animation delay (300ms)
    act(() => {
      jest.advanceTimersByTime(4000 + 300 + 50);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss after custom duration', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Fast" duration={1000} onDismiss={onDismiss} />);

    act(() => {
      jest.advanceTimersByTime(1000 + 300 + 50);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onDismiss before duration expires', () => {
    const onDismiss = jest.fn();
    render(<Toast message="Slow" duration={5000} onDismiss={onDismiss} />);

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });
});

describe('Toast — manual dismiss', () => {
  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = jest.fn();
    // Keep fake timers active and wire userEvent to use them
    const user = userEvent.setup({
      advanceTimers: (ms) => jest.advanceTimersByTime(ms),
    });
    render(<Toast message="Bye" onDismiss={onDismiss} />);

    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }));

    // The click handler calls setTimeout(onDismiss, 300) — advance past it
    act(() => { jest.advanceTimersByTime(350); });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
