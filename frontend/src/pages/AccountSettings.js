import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import Snackbar from "../components/UI/Snackbar";
import { AUTH_SNACKBAR_MESSAGES } from "../constants/authSnackbarMessages";
import ProfileIcon from "../assets/Icon_16x16/Profile_16x16.svg";
import MailIcon from "../assets/Icon_16x16/Mail_16x16.svg";
import LockIcon from "../assets/Icon_16x16/Lock_16x16.svg";
import LockedRefreshIcon from "../assets/Icon_16x16/Locked-Refresh-Body_16x16.svg";
import ProfileDefault16Icon from "../assets/Icon_Others/Profile-Default_16x16.svg";
import "../styles/AccountSettings.css";

const API = "http://localhost:5001/api/auth";

function AccountSettings() {
  const { token, user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [snackbar, setSnackbar] = useState(null); // { message, type }
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarError, setAvatarError] = useState(false);

  // Seed form from the JWT-decoded user
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || "");
      setEmail(user.email || "");
      setAvatarUrl(user.avatarUrl || "");
      setAvatarPreview(user.avatarUrl || "");
    }
  }, [user]);

  // Derive short profile id from user id
  const profileId = user?.id ? `${user.id.slice(-4).toUpperCase()}-PT` : "----";

  // --- helpers ---
  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: token,
    };
  }

  function showSnackbar(message, type = "success") {
    setSnackbar({ message, type });
  }

  // --- avatar preview ---
  function handleAvatarUrlChange(e) {
    const url = e.target.value;
    setAvatarUrl(url);
    setAvatarError(false);

    // Only attempt preview for http/https URLs
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        setAvatarPreview(url);
      } else {
        setAvatarPreview("");
      }
    } catch {
      setAvatarPreview("");
    }
  }

  function handleAvatarImgError() {
    setAvatarError(true);
    setAvatarPreview("");
  }

  // --- save ---
  async function handleSave(e) {
    e.preventDefault();
    setSnackbar(null);

    // Collect which fields changed
    const original = {
      displayName: user?.displayName || user?.username || "",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || "",
    };

    try {
      // 1. Display name
      if (displayName !== original.displayName) {
        const res = await fetch(`${API}/profile/display-name`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ displayName }),
        });
        const data = await res.json();
        if (!res.ok) {
          showSnackbar(
            data.message || AUTH_SNACKBAR_MESSAGES.changingDisplayName.generic,
            "error",
          );
          return;
        }
        // Refresh token with new data
        if (data.token) login(data.token);
        showSnackbar(AUTH_SNACKBAR_MESSAGES.changingDisplayName.success);
      }

      // 2. Avatar
      if (avatarUrl !== original.avatarUrl) {
        // Check if the image can actually load before sending
        if (avatarError) {
          showSnackbar(
            AUTH_SNACKBAR_MESSAGES.changingAvatar.brokenLink,
            "error",
          );
          return;
        }
        const res = await fetch(`${API}/profile/avatar`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ avatarUrl }),
        });
        const data = await res.json();
        if (!res.ok) {
          showSnackbar(
            data.message || AUTH_SNACKBAR_MESSAGES.changingAvatar.generic,
            "error",
          );
          return;
        }
        if (data.token) login(data.token);
        showSnackbar(AUTH_SNACKBAR_MESSAGES.changingAvatar.success);
      }

      // 3. Email
      if (email !== original.email) {
        const res = await fetch(`${API}/profile/email`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          showSnackbar(
            data.message || AUTH_SNACKBAR_MESSAGES.changingEmail.error,
            "error",
          );
          return;
        }
        if (data.token) login(data.token);
        showSnackbar(AUTH_SNACKBAR_MESSAGES.changingEmail.success);
      }

      // 4. Password (only if any password field was touched)
      if (currentPassword || password || confirmPassword) {
        if (!currentPassword) {
          showSnackbar("Please enter your current password.", "error");
          return;
        }
        if (!password || !confirmPassword) {
          showSnackbar("Please complete both new password fields.", "error");
          return;
        }
        if (password !== confirmPassword) {
          showSnackbar(
            AUTH_SNACKBAR_MESSAGES.changingPassword.mismatch,
            "error",
          );
          return;
        }
        const res = await fetch(`${API}/profile/password`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            currentPassword,
            newPassword: password,
            confirmPassword,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          showSnackbar(
            data.message || AUTH_SNACKBAR_MESSAGES.changingPassword.incorrect,
            "error",
          );
          return;
        }
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        showSnackbar(AUTH_SNACKBAR_MESSAGES.changingPassword.success);
      }

      // If nothing changed
      if (
        displayName === original.displayName &&
        avatarUrl === original.avatarUrl &&
        email === original.email &&
        !password
      ) {
        showSnackbar("No changes to save.", "notification");
      }
    } catch {
      showSnackbar("Something went wrong. Please try again.", "error");
    }
  }

  function handleCancel() {
    navigate(-1);
  }

  return (
    <div className="acct-page">
      <Header />
      <main className="acct-main">
        <div className="acct-card-stack">
          <article className="acct-card" data-node-id="27:2160">
            {/* Title row */}
            <div className="acct-header">
              <h1 className="acct-title">Account Settings</h1>
              <span className="acct-profile-id">Profile ID: {profileId}</span>
            </div>

            <form onSubmit={handleSave} className="acct-form">
              {/* Avatar section */}
              <div className="acct-avatar-section">
                <div className="acct-avatar-frame">
                  <div className="acct-avatar-gradient">
                    <div className="acct-avatar-inner">
                      {avatarPreview && !avatarError ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="acct-avatar-img"
                          onError={handleAvatarImgError}
                        />
                      ) : (
                        <img
                          src={ProfileDefault16Icon}
                          alt=""
                          className="acct-avatar-placeholder"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="acct-avatar-input-wrap">
                  <Input
                    label="Avatar Source URL"
                    value={avatarUrl}
                    onChange={handleAvatarUrlChange}
                    placeholder="https://images.unsplash.com/photo-..."
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="acct-fields">
                <Input
                  label="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Institutional_Alpha"
                  iconPosition="left"
                  icon={<img src={ProfileIcon} alt="" />}
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alpha.trader@terminal.io"
                  iconPosition="left"
                  icon={<img src={MailIcon} alt="" />}
                />

                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  iconPosition="left"
                  icon={<img src={LockIcon} alt="" />}
                />

                <Input
                  label="Change Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  iconPosition="left"
                  icon={<img src={LockedRefreshIcon} alt="" />}
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  iconPosition="left"
                  icon={<img src={LockedRefreshIcon} alt="" />}
                />
              </div>

              {/* Actions */}
              <div className="acct-actions">
                <Button type="button" variant="cancel" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </article>

          <Snackbar
            message={snackbar?.message}
            type={snackbar?.type}
            onDismiss={() => setSnackbar(null)}
          />
        </div>
      </main>
    </div>
  );
}

export default AccountSettings;
