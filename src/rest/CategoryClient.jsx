import axios from "axios";
export default axios.create({
  baseURL: "http://192.168.0.184:8080/api/finance",
  headers: {
    "Content-type": "application/json"
  }
});
