import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Home from '@Components/home/Home';
import './App.css';

const App = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  </Router>
);

export default App;
