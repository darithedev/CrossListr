import './App.css'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './routes/Home'
import Login from './routes/Login'
import Signup from './routes/Signup'

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />} >
        <Route path="home" element={<Home />} />
      </Route>
      
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App
