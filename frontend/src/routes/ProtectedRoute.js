import { useContext } from "react";
import { Navigate } from "react-router-dom"; // Navigate is used for automatic redirects
import { AuthContext } from "../context/AuthContext";

//  "wrapper component"
// the 'children' prop represents whatever component is placed inside of it in App.js (e.g., <Dashboard />)
function ProtectedRoute({ children }) {
  // tap into our global state to check for token
  const { token } = useContext(AuthContext);

  // if the token is null (meaning the user is logged out or their token expired)
  if (!token) {
    // immediately bounce them back to the login page
    // <Navigate /> renders a redirect instantly without the user doing anything
    return <Navigate to="/" />;
  }

  // access Granted
  // if they do have a token, render the 'children'.
  // this essentially means: "Go ahead and render the Dashboard on the screen."
  return children;
}

export default ProtectedRoute;
