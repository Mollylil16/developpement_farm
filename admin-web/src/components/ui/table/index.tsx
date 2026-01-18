import React, { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
}

interface TableHeaderProps {
  children: ReactNode;
  className?: string;
}

interface TableBodyProps {
  children: ReactNode;
  className?: string;
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

interface TableCellProps {
  children: ReactNode;
  isHeader?: boolean;
  className?: string;
}

const Table: React.FC<TableProps> = ({ children, className }) => {
  return <table className={`min-w-full divide-y divide-gray-200 ${className}`}>{children}</table>;
};

const TableHeader: React.FC<TableHeaderProps> = ({ children, className }) => {
  return <thead className={`bg-gray-50 ${className}`}>{children}</thead>;
};

const TableBody: React.FC<TableBodyProps> = ({ children, className }) => {
  return <tbody className={`bg-white divide-y divide-gray-200 ${className}`}>{children}</tbody>;
};

const TableRow: React.FC<TableRowProps> = ({ children, className }) => {
  return <tr className={className}>{children}</tr>;
};

const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className,
}) => {
  const CellTag = isHeader ? "th" : "td";
  const baseClasses = isHeader
    ? "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
    : "px-6 py-4 whitespace-nowrap text-sm text-gray-900";
  return <CellTag className={`${baseClasses} ${className || ""}`}>{children}</CellTag>;
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
