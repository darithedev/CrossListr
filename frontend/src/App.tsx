import './App.css'
import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './routes/Home'
import Login from './routes/Login'
import Signup from './routes/Signup'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = () => {
    setIsAuthenticated(true);
  }

  const logout = () => {
    setIsAuthenticated(false);
  }

  return (
    <Routes>
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />} >
        <Route path="home" element={<Home logout={logout} />} />
      </Route>
      
      <Route path="/login" element={<Login login={login} />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App
