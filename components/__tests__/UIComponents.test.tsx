import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../tests/utils';
import userEvent from '@testing-library/user-event';
import { 
  Button, 
  Input, 
  Select, 
  Card, 
  CardHeader, 
  CardContent, 
  Badge 
} from '../UIComponents';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies primary variant styles by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByText('Primary');
    expect(button).toHaveClass('bg-blue-600');
  });

  it('applies secondary variant styles when specified', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByText('Secondary');
    expect(button).toHaveClass('bg-gray-100');
  });

  it('applies danger variant styles when specified', () => {
    render(<Button variant="danger">Danger</Button>);
    const button = screen.getByText('Danger');
    expect(button).toHaveClass('bg-red-600');
  });

  it('applies ghost variant styles when specified', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByText('Ghost');
    expect(button).toHaveClass('text-gray-600');
  });

  it('applies outline variant styles when specified', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByText('Outline');
    expect(button).toHaveClass('border');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByText('Disabled');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });

  it('is disabled when loading is true', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByText('Loading');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50');
  });

  it('shows loader icon when loading', () => {
    const { container } = render(<Button loading>Loading</Button>);
    const loader = container.querySelector('.animate-spin');
    expect(loader).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    const button = screen.getByText('Button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders with correct button type', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByText('Submit');
    expect(button).toHaveAttribute('type', 'submit');
  });
});

describe('Input', () => {
  it('renders without label', () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    const handleChange = vi.fn();
    render(<Input label="Username" value="" onChange={handleChange} />);
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays the current value', () => {
    const handleChange = vi.fn();
    render(<Input value="test value" onChange={handleChange} />);
    expect(screen.getByRole('textbox')).toHaveValue('test value');
  });

  it('calls onChange when user types', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input value="" onChange={handleChange} />);
    
    await user.type(screen.getByRole('textbox'), 'hello');
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders with placeholder', () => {
    const handleChange = vi.fn();
    render(<Input value="" onChange={handleChange} placeholder="Enter text..." />);
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
  });

  it('renders with different input types', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input type="password" value="" onChange={handleChange} />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies custom className', () => {
    const handleChange = vi.fn();
    const { container } = render(<Input value="" onChange={handleChange} className="custom-input" />);
    expect(container.firstChild).toHaveClass('custom-input');
  });
});

describe('Select', () => {
  const options = [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
    { label: 'Option 3', value: 'opt3' }
  ];

  it('renders all options', () => {
    const handleChange = vi.fn();
    render(<Select value="opt1" onChange={handleChange} options={options} />);
    
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('renders with label', () => {
    const handleChange = vi.fn();
    render(<Select label="Choose option" value="opt1" onChange={handleChange} options={options} />);
    expect(screen.getByText('Choose option')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('displays the selected value', () => {
    const handleChange = vi.fn();
    render(<Select value="opt2" onChange={handleChange} options={options} />);
    expect(screen.getByRole('combobox')).toHaveValue('opt2');
  });

  it('calls onChange when selection changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Select value="opt1" onChange={handleChange} options={options} />);
    
    await user.selectOptions(screen.getByRole('combobox'), 'opt3');
    expect(handleChange).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const handleChange = vi.fn();
    const { container } = render(<Select value="opt1" onChange={handleChange} options={options} className="custom-select" />);
    expect(container.firstChild).toHaveClass('custom-select');
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card><div>Card content</div></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    const { container } = render(<Card><div>Content</div></Card>);
    expect(container.firstChild).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm');
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="custom-card"><div>Content</div></Card>);
    expect(container.firstChild).toHaveClass('custom-card');
  });
});

describe('CardHeader', () => {
  it('renders with title', () => {
    render(<CardHeader title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders children when no title provided', () => {
    render(<CardHeader><span>Custom header</span></CardHeader>);
    expect(screen.getByText('Custom header')).toBeInTheDocument();
  });

  it('renders action element', () => {
    render(<CardHeader title="Title" action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent><div>Content text</div></CardContent>);
    expect(screen.getByText('Content text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<CardContent className="custom-content"><div>Content</div></CardContent>);
    expect(container.firstChild).toHaveClass('custom-content');
  });
});

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Badge text</Badge>);
    expect(screen.getByText('Badge text')).toBeInTheDocument();
  });

  it('applies blue color by default', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies green color when specified', () => {
    render(<Badge color="green">Green</Badge>);
    const badge = screen.getByText('Green');
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies gray color when specified', () => {
    render(<Badge color="gray">Gray</Badge>);
    const badge = screen.getByText('Gray');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('applies red color when specified', () => {
    render(<Badge color="red">Red</Badge>);
    const badge = screen.getByText('Red');
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });
});

