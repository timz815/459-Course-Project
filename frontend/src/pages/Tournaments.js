import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import VisitorTournamentsContent from "../components/VisitorTournamentsContent";

function Tournaments() {
  const { token } = useContext(AuthContext);

  return (
    <div>
      <Header />
      {token ? <VisitorTournamentsContent /> : <VisitorTournamentsContent />}
    </div>
  );
}

export default Tournaments;
