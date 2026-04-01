import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import VisitorHomeContent from "../components/VisitorHomeContent";
import UserHomeContent from "../components/UserHomeContent";

function Home() {
  const { token } = useContext(AuthContext);

  return (
    <div>
      <Header />
      {token ? <UserHomeContent /> : <VisitorHomeContent />}
      <Footer />
    </div>
  );
}

export default Home;
