import "../styles/Footer.css";

const year = new Date().getFullYear();

function Footer() {
  return (
    <footer className="app-footer" data-node-id="27:2579">
      <div className="app-footer-inner">
        <div className="app-footer-meta">
          <p>© {year} PAPERTRADER ARENA · IAT 459 TEAM PROJECT</p>
          <p>BUILT BY DENNIS DENG, TIMOTHY ZHANG, AND LANRE ALEGBELEYE.</p>
        </div>

        <nav className="app-footer-links" aria-label="Footer links">
          <button type="button" className="app-footer-link-btn">
            TERMS
          </button>
          <button type="button" className="app-footer-link-btn">
            PRIVACY
          </button>
          <button type="button" className="app-footer-link-btn">
            SUPPORT
          </button>
          <button type="button" className="app-footer-link-btn">
            API
          </button>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
