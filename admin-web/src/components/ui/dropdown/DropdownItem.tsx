import React, { ReactNode } from "react";

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  icon?: ReactNode;
  danger?: boolean;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  className = "",
  icon,
  danger = false,
}) => {
  const baseClasses = danger
    ? "px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
    : "px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 ${baseClasses} ${className}`}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </div>
  );
};
