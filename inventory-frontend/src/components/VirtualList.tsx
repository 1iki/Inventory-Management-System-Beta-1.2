import React from 'react';

// This component is not currently used in the application.
// Minimal implementation provided to avoid build errors.

interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemSize: number;
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void>;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

export function VirtualList<T>({
  items,
  renderItem,
  emptyMessage = 'No items found',
  className = ''
}: VirtualListProps<T>) {
  if (items.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-gray-500 text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}

interface VirtualTableProps<T> {
  data: T[];
  columns: Array<{
    header: string;
    accessor: keyof T | ((item: T) => React.ReactNode);
    width?: string;
    className?: string;
  }>;
  height?: number;
  rowHeight?: number;
  hasNextPage?: boolean;
  isNextPageLoading?: boolean;
  loadNextPage?: () => Promise<void>;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available'
}: VirtualTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="flex bg-gray-100 font-semibold text-gray-700 border-b border-gray-200">
        {columns.map((column, index) => (
          <div
            key={index}
            className={`px-4 py-3 ${column.width || 'flex-1'} ${
              column.className || ''
            }`}
          >
            {column.header}
          </div>
        ))}
      </div>

      {/* Table Body */}
      <div>
        {data.map((item, rowIndex) => (
          <div
            key={rowIndex}
            className={`flex items-center border-b border-gray-200 hover:bg-gray-50 transition-colors ${
              onRowClick ? 'cursor-pointer' : ''
            }`}
            onClick={() => onRowClick?.(item)}
          >
            {columns.map((column, colIndex) => {
              const value =
                typeof column.accessor === 'function'
                  ? column.accessor(item)
                  : item[column.accessor];

              return (
                <div
                  key={colIndex}
                  className={`px-4 py-3 ${column.width || 'flex-1'} ${
                    column.className || ''
                  }`}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default VirtualList;
