import { useEffect, useRef, useState } from "react";
import ProfileDefault16Icon from "../../assets/Icon_Others/Profile-Default_16x16.svg";
import Dropdown8Icon from "../../assets/Icon_8x8/Dropdown_8x8.svg";
import Collpse8Icon from "../../assets/Icon_8x8/Collpse_8x8.svg";
import Profile16Icon from "../../assets/Icon_16x16/Profile_16x16.svg";
import Dashboard16Icon from "../../assets/Icon_16x16/Dashboard_16x16.svg";
import Defense16Icon from "../../assets/Icon_16x16/Defense_16x16.svg";
import Exit16Icon from "../../assets/Icon_16x16/Exit_16x16.svg";
import "../../styles/ProfileDropdown.css";

function ProfileDropdown({
  userName,
  avatarUrl,
  isAdmin = false,
  accountBalance = 100000,
  onAccountSettings,
  onDashboard,
  onAdminDashboard,
  onLogout,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const formattedBalance = `$${Number(accountBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="profile-dropdown" ref={dropdownRef}>
      <button
        type="button"
        className={`profile-dropdown-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <img
          src={avatarUrl || ProfileDefault16Icon}
          alt=""
          className={`profile-dropdown-trigger-icon${avatarUrl ? " profile-dropdown-trigger-icon--avatar" : ""}`}
        />
        <span className="profile-dropdown-name">{userName}</span>
        <img
          src={open ? Collpse8Icon : Dropdown8Icon}
          alt=""
          className="profile-dropdown-caret"
        />
      </button>

      {open && (
        <div className="profile-dropdown-menu" role="menu">
          <div className="profile-dropdown-balance">
            <p className="profile-dropdown-balance-label">Account Balance</p>
            <p className="profile-dropdown-balance-value">{formattedBalance}</p>
          </div>

          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-item-active"
            onClick={() => {
              onAccountSettings?.();
              setOpen(false);
            }}
          >
            <img
              src={Profile16Icon}
              alt=""
              className="profile-dropdown-item-icon"
            />
            <span>Account Settings</span>
          </button>

          <button
            type="button"
            className="profile-dropdown-item"
            onClick={() => {
              onDashboard?.();
              setOpen(false);
            }}
          >
            <img
              src={Dashboard16Icon}
              alt=""
              className="profile-dropdown-item-icon"
            />
            <span>Dashboard</span>
          </button>

          {isAdmin && (
            <button
              type="button"
              className="profile-dropdown-item"
              onClick={() => {
                onAdminDashboard?.();
                setOpen(false);
              }}
            >
              <img
                src={Defense16Icon}
                alt=""
                className="profile-dropdown-item-icon"
              />
              <span>Admin Dashboard</span>
            </button>
          )}

          <div className="profile-dropdown-divider" />

          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-item-logout"
            onClick={() => {
              onLogout?.();
              setOpen(false);
            }}
          >
            <img
              src={Exit16Icon}
              alt=""
              className="profile-dropdown-item-icon"
            />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;
