/**
 * Tests for src/components/ui/Modal.tsx
 * createPortal mock: renders children directly so they're queryable in the DOM
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock createPortal so the modal content renders in the test container
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

import Modal from '@/components/ui/Modal';

const noop = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

describe('Modal — closed state', () => {
  it('renders nothing when isOpen=false', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={noop} title="Test">
        <p>Content</p>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('Modal — open state', () => {
  function renderOpen(onClose = noop) {
    return render(
      <Modal isOpen onClose={onClose} title="My Modal">
        <p>Modal body</p>
      </Modal>,
    );
  }

  it('renders role="dialog" when open', () => {
    renderOpen();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true"', () => {
    renderOpen();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('shows the title prop', () => {
    renderOpen();
    expect(screen.getByText('My Modal')).toBeInTheDocument();
  });

  it('renders children', () => {
    renderOpen();
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('has a close button with aria-label', () => {
    renderOpen();
    expect(screen.getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    renderOpen(onClose);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Close modal' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    renderOpen(onClose);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = jest.fn();
    renderOpen(onClose);
    const user = userEvent.setup();
    // The backdrop has aria-hidden="true"
    const backdrop = document.querySelector('[aria-hidden="true"]') as Element;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
