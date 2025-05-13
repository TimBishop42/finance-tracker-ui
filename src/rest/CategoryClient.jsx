import axios from "axios";

export default axios.create({
  baseURL: "/api",  // This will be proxied by httpd
  headers: {
    "Content-type": "application/json"
  }
});
