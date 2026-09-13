import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from './button.js';

afterEach(() => {
  cleanup();
});

describe('Button', () => {
  it('is a native button with an accessible name, and never a submit button by default', () => {
    render(<Button>Add to basket</Button>);
    const button = screen.getByRole('button', { name: 'Add to basket' });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('activates on click, and on Enter and Space from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Accept order</Button>);

    await user.click(screen.getByRole('button'));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onClick).toHaveBeenCalledTimes(3);
  });

  it('is reached with Tab and carries the focus-ring styles', async () => {
    const user = userEvent.setup();
    render(<Button>Pay</Button>);

    await user.tab();
    const button = screen.getByRole('button', { name: 'Pay' });
    expect(document.activeElement).toBe(button);
    expect(button.className).toContain('focus-visible:outline-focus');
  });

  it('does nothing when disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Place order
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Place order' });
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders a link with button styling when asChild', () => {
    render(
      <Button asChild variant="secondary">
        <a href="/basket">View basket</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'View basket' });
    expect(link.getAttribute('href')).toBe('/basket');
    expect(link.hasAttribute('type')).toBe(false);
    expect(link.className).toContain('border-border');
  });

  it('lets callers add classes, with theirs winning a conflict', () => {
    render(<Button className="px-8">Wide</Button>);
    const classes = screen.getByRole('button', { name: 'Wide' }).className.split(' ');
    expect(classes).toContain('px-8');
    expect(classes).not.toContain('px-4');
  });
});
