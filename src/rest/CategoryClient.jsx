import axios from "axios";
export default axios.create({
  baseURL: "http://10.0.0.118:8080/api/finance",
  headers: {
    "Content-type": "application/json"
  }
});
