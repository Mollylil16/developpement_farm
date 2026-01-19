import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { useAuth } from "../../contexts/AuthContext";
import { User, Settings, HelpCircle, LogOut } from "lucide-react";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function toggleDropdown(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleLogout = () => {
    logout();
    closeDropdown();
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dark:text-gray-400 dropdown-toggle"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
          <div className="w-11 h-11 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold">
            {admin?.prenom?.[0] || admin?.nom?.[0] || "A"}
          </div>
        </span>

        <span className="block mr-1 font-medium text-sm">
          {admin?.prenom || admin?.nom || "Admin"}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div>
          <span className="block font-medium text-gray-700 text-sm dark:text-gray-400">
            {admin?.prenom && admin?.nom
              ? `${admin.prenom} ${admin.nom}`
              : admin?.prenom || admin?.nom || "Administrateur"}
          </span>
          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
            {admin?.email || "admin@farmtrackpro.com"}
          </span>
        </div>

        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <DropdownItem
              onClick={() => {
                navigate("/profile");
                closeDropdown();
              }}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <User className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              Modifier le profil
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onClick={() => {
                navigate("/settings");
                closeDropdown();
              }}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <Settings className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              Paramètres du compte
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              onClick={() => {
                navigate("/support");
                closeDropdown();
              }}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
            >
              <HelpCircle className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
              Support
            </DropdownItem>
          </li>
        </ul>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        >
          <LogOut className="h-5 w-5 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300" />
          Déconnexion
        </button>
      </Dropdown>
    </div>
  );
}
