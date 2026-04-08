import { Link } from "react-router-dom";
import Header from "../components/Header";
import "../styles/NotFound.css";

function NotFound() {
  return (
    <div className="notfound-page">
      <Header />

      <main className="notfound-main">
        <div className="notfound-blur-blue" aria-hidden="true" />
        <div className="notfound-blur-green" aria-hidden="true" />

        <div className="notfound-container">
          <p className="notfound-code">404</p>
          <h1 className="notfound-heading">Page Not Found</h1>
          <p className="notfound-subtitle">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="notfound-actions">
            <Link to="/" className="notfound-home-btn">
              Back to Home
            </Link>
            <Link to="/tournaments" className="notfound-browse-link">
              Browse Tournaments
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default NotFound;
