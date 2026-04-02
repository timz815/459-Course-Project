import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import TournamentsContent from "../components/TournamentsContent";

function Tournaments() {
  const { token } = useContext(AuthContext);

  return (
    <div>
      <Header />
      <TournamentsContent isLoggedIn={!!token} />
    </div>
  );
}

export default Tournaments;
