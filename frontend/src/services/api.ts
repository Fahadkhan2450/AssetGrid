import axios from 'axios';

export const API =
  import.meta.env.VITE_API_URL ||
  '/api';

export const SOCKET =
  import.meta.env.VITE_SOCKET_URL ||
  window.location.origin;

export const api = axios.create({
  baseURL: API,
  timeout: 30000,
});

/*
|--------------------------------------------------------------------------
| REQUEST INTERCEPTOR
|--------------------------------------------------------------------------
|
| Automatically attach JWT token to every API request.
|
*/

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    /*
     * For FormData requests, allow the browser
     * to automatically set Content-Type and boundary.
     */
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/*
|--------------------------------------------------------------------------
| RESPONSE INTERCEPTOR
|--------------------------------------------------------------------------
|
| If the backend returns 401, remove the expired/invalid
| authentication information and send the user to login.
|
*/

api.interceptors.response.use(
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (
        window.location.pathname !==
        '/login'
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;