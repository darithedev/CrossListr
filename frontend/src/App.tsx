import './App.css'
import { Routes, Route } from 'react-router-dom'
import Login from './routes/Login'
import Signup from './routes/Signup'

function App() {

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </>
  )
}

export default App
