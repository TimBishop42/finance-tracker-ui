import logo from './logo.svg';
import './App.css';
import React, {useState, useEffect} from 'react';
import TransactionForm from './components/TransactionForm';
import CategoryClient from './rest/CategoryClient';
<<<<<<< HEAD
=======
import Transactions from './components/Transactions';
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0



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
<<<<<<< HEAD
        <img src={logo} className="App-logo" alt="logo" />
        <div class="forms">
          <TransactionForm categories={categories}/>
        </div>
=======
        <div class="Forms">
          <TransactionForm categories={categories}/>
        </div>
        <div class="transactions">
          <Transactions/>
        </div>
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
      </header>
    </div>
  );
}

export default App;
