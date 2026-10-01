import { Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth.jsx';
import Home from './pages/home.jsx';
import GameRoom from './pages/GameRoom.jsx';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/game/:room_code" element={<GameRoom />} />
    </Routes>
  );
}

export default App;
