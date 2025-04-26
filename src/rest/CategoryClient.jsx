import axios from "axios";

export default axios.create({
  baseURL: "/api/finance",  // This will be proxied by httpd
  headers: {
    "Content-type": "application/json"
  }
});
