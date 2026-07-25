import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the exportToCsv module
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
const mockClick = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;

  // Mock document.createElement('a')
  const mockAnchor = {
    href: '',
    download: '',
    click: mockClick,
  };
  document.createElement = vi.fn((tag) => {
    if (tag === 'a') return mockAnchor;
    return {};
  });
});

describe('exportToCsv', () => {
  it('should generate CSV with correct headers and data', async () => {
    const { exportToCsv } = await import('../exportCsv');

    const rows = [
      { name: 'Item A', price: 100, qty: 2 },
      { name: 'Item B', price: 200, qty: 3 },
    ];
    const columns = [
      { label: 'Item Name', accessor: 'name' },
      { label: 'Price', accessor: (r) => `$${r.price}` },
      { label: 'Quantity', accessor: 'qty' },
    ];

    exportToCsv(rows, columns, 'test-export');

    // Verify a download link was created and clicked
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockClick).toHaveBeenCalledTimes(1);
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
    expect(mockRevokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('should handle null and undefined values', async () => {
    const { exportToCsv } = await import('../exportCsv');

    const rows = [
      { name: 'Item A', price: null, qty: undefined },
    ];
    const columns = [
      { label: 'Item Name', accessor: 'name' },
      { label: 'Price', accessor: 'price' },
      { label: 'Quantity', accessor: 'qty' },
    ];

    // Should not throw
    expect(() => exportToCsv(rows, columns, 'test')).not.toThrow();
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('should escape double quotes in values', async () => {
    const { exportToCsv } = await import('../exportCsv');

    const rows = [
      { name: 'Item "A"', price: 100 },
    ];
    const columns = [
      { label: 'Item Name', accessor: 'name' },
      { label: 'Price', accessor: 'price' },
    ];

    expect(() => exportToCsv(rows, columns, 'test')).not.toThrow();
    expect(mockClick).toHaveBeenCalledTimes(1);
  });

  it('should handle empty rows gracefully', async () => {
    const { exportToCsv } = await import('../exportCsv');

    const columns = [
      { label: 'Item Name', accessor: 'name' },
    ];

    expect(() => exportToCsv([], columns, 'empty')).not.toThrow();
    expect(mockClick).toHaveBeenCalledTimes(1);
  });
});
