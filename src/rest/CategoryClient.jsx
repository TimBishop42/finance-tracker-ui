import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL;
export default axios.create({
  baseURL: backendUrl,
  // baseURL: "http://192.168.1.105:8080/api/finance",
  // http://192.168.0.67:8080/api/finance
  headers: {
    "Content-type": "application/json"
  }
});
