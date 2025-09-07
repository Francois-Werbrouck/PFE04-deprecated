import { NavLink } from "react-router-dom";

export default function SidebarLink({ to, icon, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition " +
        (isActive
          ? "bg-indigo-600 text-white shadow"
          : "text-gray-700 hover:bg-indigo-50 dark:text-gray-200 dark:hover:bg-gray-800")
      }
    >
      {icon}
      {children}
    </NavLink>
  );
}
