import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import VisitorHomeContent from "../components/VisitorHomeContent";
import UserHomeContent from "../components/UserHomeContent";

function Home() {
  const { token } = useContext(AuthContext);

  return (
    <div>
      <Header />
      {token ? <UserHomeContent /> : <VisitorHomeContent />}
    </div>
  );
}

export default Home;
