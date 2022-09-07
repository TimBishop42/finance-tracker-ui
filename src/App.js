import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react';
import TransactionForm from './components/TransactionForm';
import CategoryClient from './rest/CategoryClient';



function App() {

  const [categories, setCategories] = useState([]);

  useEffect(() => {
    CategoryClient.get('/get-categories').then((response) => {
      setCategories(response.data);
    });
 }, []);


  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <div class="forms">
          <TransactionForm categories={categories}/>
        </div>
      </header>
    </div>
  );
}

export default App;
