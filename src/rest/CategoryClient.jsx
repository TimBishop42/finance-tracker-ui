import axios from "axios";
export default axios.create({
  baseURL: "/api/finance",
  headers: {
    "Content-type": "application/json"
  }
});
