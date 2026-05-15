import './App.css'
import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './routes/Home'
import Login from './routes/Login'
import Signup from './routes/Signup'
import ItemForm from './routes/ItemForm'
import ItemDetails from './routes/ItemDetails'

function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />} >
        <Route path="home" element={<Home />} />
        <Route path="/items/new" element={<ItemForm />} />
        <Route path="/items/:id/edit" element={<ItemForm />} />
        <Route path="/items/:id" element={<ItemDetails />} />
      </Route>
      
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Routes>
  )
}

export default App
