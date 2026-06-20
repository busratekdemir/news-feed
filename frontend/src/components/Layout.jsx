import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import MarketTicker from "./MarketTicker";

function Layout() {
  return (
    <>
      <Navbar />
      <MarketTicker />
      <main className="page-container">
        <Outlet />
      </main>
    </>
  );
}

export default Layout;
