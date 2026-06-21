import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./style.css";

import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Categories from "./pages/Categories";
import BreakingNews from "./pages/BreakingNews";
import Explore from "./pages/Explore";
import NewsDetail from "./pages/NewsDetail";
import SavedNews from "./pages/SavedNews";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="categories" element={<Categories />} />
            <Route path="breaking" element={<BreakingNews />} />
            <Route path="explore" element={<Explore />} />
            <Route path="saved" element={<SavedNews />} />
            <Route path="news/:id" element={<NewsDetail />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
