import React from "react";

interface BackdropProps {
  isOpen: boolean;
  onClose: () => void;
}

const Backdrop: React.FC<BackdropProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm lg:hidden"
      onClick={onClose}
    />
  );
};

export default Backdrop;
