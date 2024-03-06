import axios from "axios";
export default axios.create({
  baseURL: "http://192.168.1.102:8080/api/finance",
  // baseURL: "http://192.168.1.105:8080/api/finance",
  headers: {
    "Content-type": "application/json"
  }
});
