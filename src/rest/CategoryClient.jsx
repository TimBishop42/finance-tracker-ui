import axios from "axios";
export default axios.create({
<<<<<<< HEAD
  baseURL: "http://localhost:8080/finance",
=======
  baseURL: "http://10.0.0.118:8080/finance",
>>>>>>> fb965404fb39c1a1e96aa9232c048479ffcc17b0
  headers: {
    "Content-type": "application/json"
  }
});
