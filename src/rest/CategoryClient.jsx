import axios from "axios";
export default axios.create({
  baseURL: "http://localhost:8080/finance",
  headers: {
    "Content-type": "application/json",
    'Access-Control-Allow-Origin': '*'
  }
});
