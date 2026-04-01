export const AUTH_SNACKBAR_MESSAGES = {
  login: {
    success: "Login successful. Redirecting to your dashboard in 3 seconds...",
    error: "The email or password you entered is incorrect.",
  },
  register: {
    duplicateName: "That username is already in use. Please choose another.",
    duplicateEmail: "That email address is already in use by another account.",
    generic: "Unable to create your account. Please try again.",
  },
  passwordRecovery: {
    success:
      "If an account exists, a recovery link has been sent to your inbox.",
    error: "Unable to send the recovery email. Please try again.",
  },
  changingDisplayName: {
    success: "Your display name has been updated.",
    duplicate: "That display name is already in use. Please choose another.",
    length: "Display names must be between 3 and 20 characters.",
    invalid:
      "Display names can only contain letters, numbers, and underscores.",
    generic: "Unable to update your display name. Please try again.",
  },
  changingAvatar: {
    success: "Your profile picture has been updated.",
    invalidUrl: "Please enter a valid image URL.",
    brokenLink:
      "We couldn't load an image from that link. Please check the URL.",
    generic: "Unable to update your profile picture. Please try again.",
  },
  changingPassword: {
    success: "Your password has been successfully updated.",
    mismatch: "The new password and confirmation password do not match.",
    incorrect: "Your current password is incorrect. Please try again.",
  },
  changingEmail: {
    success: "We've sent a verification link to your new email address.",
    error: "That email address is already in use by another account.",
  },
};
