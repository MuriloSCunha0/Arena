import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../../components/ui/Button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    render(<Button>Test Button</Button>);
    const button = screen.getByRole('button', { name: /test button/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-brand-green');
    expect(button).not.toBeDisabled();
  });
  
  it('renders correctly with variant="outline"', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button', { name: /outline button/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('border-brand-green');
    expect(button).not.toHaveClass('bg-brand-green');
  });
  
  it('renders correctly with variant="danger"', () => {
    render(<Button variant="danger">Danger Button</Button>);
    const button = screen.getByRole('button', { name: /danger button/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-brand-orange');
  });
  
  it('renders as disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });
  
  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('does not call onClick handler when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Disabled Button</Button>);
    const button = screen.getByRole('button', { name: /disabled button/i });
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
  
  it('renders with loading state', () => {
    render(<Button loading>Loading Button</Button>);
    
    // Check if there's a loading spinner
    const loadingSpinner = screen.getByTestId('loading-spinner');
    expect(loadingSpinner).toBeInTheDocument();
    
    // Button should be disabled when loading
    const button = screen.getByRole('button', { name: /loading button/i });
    expect(button).toBeDisabled();
  });
  
  it('renders children correctly', () => {
    render(
      <Button>
        <span data-testid="child-element">Custom Content</span>
      </Button>
    );
    
    const childElement = screen.getByTestId('child-element');
    expect(childElement).toBeInTheDocument();
    expect(childElement).toHaveTextContent('Custom Content');
  });
});
